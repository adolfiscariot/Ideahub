using System;
using System.Linq;
using System.Threading.Tasks;
using api.Constants;
using api.Data;
using api.Helpers;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScoringController : ControllerBase
{
    private readonly IdeahubDbContext _context;
    private readonly IScoringService _scoringService;
    private readonly ILogger<ScoringController> _logger;

    public ScoringController(IdeahubDbContext context, IScoringService scoringService, ILogger<ScoringController> logger)
    {
        _context = context;
        _scoringService = scoringService;
        _logger = logger;
    }

    // Phase 1: Automated AI Evaluation
    [HttpPost("evaluate/{ideaId}")]
    [Authorize]
    public async Task<IActionResult> EvaluateIdea(int ideaId)
    {
        var idea = await _context.Ideas.FirstOrDefaultAsync(i => i.Id == ideaId);

        // Check if idea exists
        if (idea == null){
            _logger.LogError("Idea not found");
            return NotFound(ApiResponse.Fail("Idea not found."));
        }

        // Current stage must be evaluation
        if (idea.CurrentStage != ScoringStage.Evaluation)
            return BadRequest(ApiResponse.Fail($"Cannot evaluate idea in stage: {idea.CurrentStage}"));

        // Use Scoring Service
        try
        {
            var (score, reasoning) = await _scoringService.EvaluateAndStageIdeaAsync(idea);

            return Ok(ApiResponse.Ok("Phase 1: AI Evaluation completed.", new { 
                Score = score, 
                Reasoning = reasoning,
                NextStage = idea.CurrentStage.ToString()
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError("Phase 1 scoring failed");
            return StatusCode(500, ApiResponse.Fail($"Failed to evaluate idea: {ex.Message}"));
        }
    }

    // Phase 2: Manual Business Case Submission
    [HttpPost("business-case/{ideaId}")]
    [Authorize(Roles = RoleConstants.CommitteeMember + "," + RoleConstants.SuperAdmin)]
    public async Task<IActionResult> SubmitBusinessCase(int ideaId, [FromBody] BusinessCaseDto dto)
    {
        _logger.LogInformation("Phase 2 scoring (Business Case) beginning...");
        // Fetch relevant idea
        var idea = await _context.Ideas
            .Include(i => i.BusinessCase)
            .FirstOrDefaultAsync(i => i.Id == ideaId);

        if (idea == null)
            return NotFound(ApiResponse.Fail("Idea not found."));

        if (idea.CurrentStage != ScoringStage.BusinessCase)
            return BadRequest(ApiResponse.Fail("Idea is not in the Business Case stage. Please ensure Phase 1 passed with 70%+."));

        if (idea.Score < 70)
            return BadRequest(ApiResponse.Fail("Phase 1 score threshold not met."));

        var businessCase = idea.BusinessCase ?? new BusinessCase { IdeaId = idea.Id };
        
        // Map DTO to Model
        businessCase.ExpectedBenefits = dto.ExpectedBenefits;
        businessCase.ImpactScope = dto.ImpactScope;
        businessCase.RiskLevel = dto.RiskLevel;
        businessCase.EvaluationStatus = dto.EvaluationStatus;
        businessCase.OwnerDepartment = dto.OwnerDepartment;
        businessCase.NextSteps = dto.NextSteps;
        businessCase.DecisionDate = dto.DecisionDate;
        businessCase.PlannedDurationWeeks = dto.PlannedDurationWeeks;
        businessCase.CurrentStage = dto.CurrentStage;
        businessCase.Verdict = dto.Verdict;
        businessCase.UpdatedAt = DateTime.UtcNow;

        if (idea.BusinessCase == null)
        {
            _context.BusinessCases.Add(businessCase);
        }
        else
        {
            _context.BusinessCases.Update(businessCase);
        }

        // Move to Phase 3 if Verdict is Approved
        if (businessCase.Verdict == Verdict.Approved)
        {
            idea.CurrentStage = ScoringStage.ScoringDimensions;
            _logger.LogInformation("Proceeded to Phase 3 scoring");
        }
        else
        {
            _logger.LogInformation("Idea didn't meet scoring threshold for promotion to phase 3");
        }

        idea.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Phase 2 scoring successful!");
        return Ok(ApiResponse.Ok("Phase 2: Business Case submitted.", new { 
            Verdict = businessCase.Verdict.ToString(),
            NextStage = idea.CurrentStage.ToString()
        }));
    }

    // Phase 3: Manual Scoring Dimensions
    [HttpPost("dimensions/{ideaId}")]
    [Authorize(Roles = RoleConstants.CommitteeMember + "," + RoleConstants.SuperAdmin)]
    public async Task<IActionResult> SubmitScoringDimensions(int ideaId, [FromBody] ScoringDimensionsDto dto)
    {
        _logger.LogInformation("Phase 3 scoring beginning...");

        var idea = await _context.Ideas
            .Include(i => i.BusinessCase)
            .Include(i => i.ScoringDimensions)
            .FirstOrDefaultAsync(i => i.Id == ideaId);

        if (idea == null)
            return NotFound(ApiResponse.Fail("Idea not found."));

        if (idea.CurrentStage != ScoringStage.ScoringDimensions)
            return BadRequest(ApiResponse.Fail("Idea is not in the Scoring Dimensions stage. Please ensure the Business Case was Approved."));

        if (idea.BusinessCase == null || idea.BusinessCase.Verdict != Verdict.Approved)
            return BadRequest(ApiResponse.Fail("Business Case Verdict must be Approved to enter Phase 3."));

        var dimensions = idea.ScoringDimensions ?? new ScoringDimensions { IdeaId = idea.Id };

        // Map DTO
        dimensions.StrategicAlignment = dto.StrategicAlignment;
        dimensions.CustomerImpact = dto.CustomerImpact;
        dimensions.FinancialBenefit = dto.FinancialBenefit;
        dimensions.Feasibility = dto.Feasibility;
        dimensions.TimeToValue = dto.TimeToValue;
        dimensions.Cost = dto.Cost;
        dimensions.Effort = dto.Effort;
        dimensions.Risk = dto.Risk;
        dimensions.Scalability = dto.Scalability;
        dimensions.Differentiation = dto.Differentiation;
        dimensions.SustainabilityImpact = dto.SustainabilityImpact;
        dimensions.ProjectConfidence = dto.ProjectConfidence;
        dimensions.ReviewerComments = dto.ReviewerComments;

        // Formula: ( sum(12 fields) / (No of fields * 5(max score of each field)) ) * 100
        float sum = (int)dto.StrategicAlignment + (int)dto.CustomerImpact + (int)dto.FinancialBenefit +
                    (int)dto.Feasibility + (int)dto.TimeToValue + (int)dto.Cost + (int)dto.Effort +
                    (int)dto.Risk + (int)dto.Scalability + (int)dto.Differentiation +
                    (int)dto.SustainabilityImpact + (int)dto.ProjectConfidence;

        dimensions.Score = (sum / 60.0f) * 100;

        if (idea.ScoringDimensions == null)
        {
            _context.ScoringDimensions.Add(dimensions);
        }
        else
        {
            _context.ScoringDimensions.Update(dimensions);
        }

        // Final score stored in Idea model
        idea.Score = (float)dimensions.Score;
        idea.CurrentStage = ScoringStage.Completed;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Phase 3 scoring successful!");
        return Ok(ApiResponse.Ok("Phase 3: Scoring Dimensions completed.", new { 
            CalculatedPercentage = dimensions.Score,
            FullScore = sum,
            NextStage = idea.CurrentStage.ToString()
        }));
    }
}
