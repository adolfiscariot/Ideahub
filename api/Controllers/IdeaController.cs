using System.Security.Claims;
using api.Data;
using api.Helpers;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class IdeaController : ControllerBase
{
    private readonly UserManager<IdeahubUser> _userManager;
    private readonly ILogger<IdeaController> _logger;
    private readonly IdeahubDbContext _context;
    public IdeaController(ILogger<IdeaController> logger, IdeahubDbContext context, UserManager<IdeahubUser> userManager)
    {
        _logger = logger;
        _context = context;
        _userManager = userManager;
    }

    //Create Ideas
    [HttpPost("create-idea")]
    public async Task<IActionResult> CreateIdea(IdeaDto ideaDto, int groupId)
    {
        try
        {
            _logger.LogInformation("Creating new idea...");

            //Fetch user info
            var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("User id is null. Can't create a new idea");
                return Unauthorized(ApiResponse.Fail("User Id is null"));
            }

            //check if user is a group member
            var group = await _context.Groups.FindAsync(groupId);
            if (group is null)
            {
                _logger.LogError("Group not found");
                return NotFound(ApiResponse.Fail("Group not found"));
            }

            var isAMember = await _context.UserGroups.AnyAsync(ug => ug.GroupId == groupId && ug.UserId == userId);
            if (!isAMember)
            {
                _logger.LogError("User {userEmail} is not in group {groupName}", userEmail, group.Name);
                return Unauthorized(ApiResponse.Fail("User not in group"));
            }

            //Create new idea
            var idea = new Idea
            {
                Title = ideaDto.Title,
                StrategicAlignment = ideaDto.StrategicAlignment,
                ProblemStatement = ideaDto.ProblemStatement,
                ProposedSolution = ideaDto.ProposedSolution,
                UseCase = ideaDto.UseCase,
                InnovationCategory = ideaDto.InnovationCategory,
                SubCategory = ideaDto.SubCategory,
                TechnologyInvolved = ideaDto.TechnologyInvolved,
                Notes = ideaDto.Notes,
                UserId = userId,
                GroupId = groupId
            };

            //add to database
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            // Trigger Phase 1: Automated AI Evaluation
            try
            {
                var llmService = HttpContext.RequestServices.GetRequiredService<ILlmService>();
                var (aiScore, aiReasoning) = await llmService.EvaluateIdeaAsync(idea);

                idea.Score = aiScore;
                idea.AiReasoning = aiReasoning;

                if (aiScore >= 70)
                {
                    idea.CurrentStage = ScoringStage.BusinessCase;
                }
                else
                {
                    idea.CurrentStage = ScoringStage.Rejected;
                }

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during automated AI evaluation for idea {IdeaId}", idea.Id);
            }

            _logger.LogInformation("New idea created and evaluated by AI by {userEmail}", userEmail);
            return Ok(ApiResponse.Ok($"New Idea Created by {userEmail}",
            new {
                    id = idea.Id
                }
            ));
        }
        catch (Exception e)
        {
            _logger.LogError("Failed to create idea {e}", e);
            return BadRequest(ApiResponse.Fail("Failed to create idea"));
        }
    }

    //View all ideas
    [HttpGet("view-ideas")]
    public async Task<IActionResult> ViewIdeas(int groupId, string? type, string? domain, string? impact)
    {
        //Fetch user
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogError("User Id not found");
            return Unauthorized(ApiResponse.Fail("User Id not found"));
        }

        //Fetch group
        var group = await _context.Groups.FindAsync(groupId);
        if (group is null)
        {
            _logger.LogError("Group not found");
            return NotFound(ApiResponse.Fail("Group not found"));
        }

        //Ensure user is in group
        var isAMember = await _context.UserGroups.AnyAsync(ug => ug.GroupId == groupId && ug.UserId == userId);
        if (!isAMember)
        {
            _logger.LogError("User {userEmail} isn't in the group {groupName}", userEmail, group.Name);
            return NotFound(ApiResponse.Fail("User not in group"));
        }

        //Fetch ideas and votes
        var ideas = await _context.Ideas
            .Where(i => i.GroupId == groupId)
            .Include(i => i.Votes)
            .ToListAsync();

        if (ideas.Count == 0)
        {
            _logger.LogInformation("No ideas found in group: {groupName}", group.Name);
            return Ok(ApiResponse.Ok("No ideas found", new List<object>()));
        }

        var ideaDataToReturn = new List<object>();
        foreach (var idea in ideas)
        {
            ideaDataToReturn.Add(new {
                idea.Id,
                idea.Title,
                idea.StrategicAlignment,
                idea.ProblemStatement,
                idea.ProposedSolution,
                idea.UseCase,
                idea.InnovationCategory,
                idea.SubCategory,
                idea.TechnologyInvolved,
                idea.Notes,
                idea.Score,
                idea.UserId,
                idea.Group.Name,
                idea.CreatedAt,
                idea.IsPromotedToProject,
                idea.IsDeleted,
                voteCount = idea.Votes.Count,
                userVoted = idea.Votes.Any(v => v.UserId == userId),
                Status = idea.Status.ToString()
            });
        }

        
        return Ok(ApiResponse.Ok($"{ideas.Count()} Ideas found", ideaDataToReturn));
    }

    //View an idea
    [HttpGet("open-idea")]
    public async Task<IActionResult> OpenIdea(int groupId, int ideaId)
    {
        //Fetch user
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogError("User Id not found");
            return Unauthorized(ApiResponse.Fail("User Id not found"));
        }

        //Fetch group
        var group = await _context.Groups.FindAsync(groupId);
        if (group is null)
        {
            _logger.LogError("Group not found");
            return NotFound(ApiResponse.Fail("Group not found"));
        }

        //Ensure user is in group
        var isAMember = await _context.UserGroups.AnyAsync(ug => ug.GroupId == groupId && ug.UserId == userId);
        if (!isAMember)
        {
            _logger.LogError("User {userEmail} isn't in the group {groupName}", userEmail, group.Name);
            return NotFound(ApiResponse.Fail("User not in group"));
        }

        //Fetch idea
        var idea = await _context.Ideas
            .Include(i => i.User)
            .Include(i => i.Group)
            .FirstOrDefaultAsync(i => i.Id == ideaId && i.GroupId == groupId);
        if (idea is null)
        {
            _logger.LogError("Idea with Id {ideaId} not found in group {groupName}", ideaId, group.Name);
            return NotFound(ApiResponse.Fail("Idea not found"));
        }

        //Create a list of idea data to return
        var ideaDataToReturn = new IdeaDetailsDto
        {
            Title = idea.Title,
            StrategicAlignment = idea.StrategicAlignment,
            ProblemStatement = idea.ProblemStatement,
            ProposedSolution = idea.ProposedSolution,
            UseCase = idea.UseCase,
            InnovationCategory = idea.InnovationCategory,
            SubCategory = idea.SubCategory,
            TechnologyInvolved = idea.TechnologyInvolved,
            Notes = idea.Notes,
            Score = idea.Score,
            Author = idea.User.DisplayName,
            Group = idea.Group.Name,
            Status = idea.Status.ToString(),
            IsPromotedToProject = idea.IsPromotedToProject
        };

        _logger.LogInformation("Idea found: {ideaDataToReturn}", ideaDataToReturn);
        return Ok(ApiResponse.Ok("Idea found", ideaDataToReturn));
    }

    //Update an idea
    [HttpPut("{ideaId}")]
    public async Task<IActionResult> UpdateIdea(int ideaId, IdeaUpdateDto ideaUpdateDto)
    {
        //Fetch user info
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogError("User id is null. Can't create a new idea");
            return Unauthorized(ApiResponse.Fail("User Id is null"));
        }

        //fetch idea if user is the idea author
        var idea = await _context.Ideas
            .Include(i => i.User)
            .Include(i => i.Group)
            .Where(i => i.UserId == userId)
            .FirstOrDefaultAsync(i => i.Id == ideaId);
        if (idea is null)
        {
            _logger.LogError("Idea not found");
            return NotFound(ApiResponse.Fail("Idea not found"));
        }

        //apply changes to the idea
        if (ideaUpdateDto.Title != null)
        {
            idea.Title = ideaUpdateDto.Title;
        }
        if (ideaUpdateDto.StrategicAlignment != null)
        {
            idea.StrategicAlignment = ideaUpdateDto.StrategicAlignment;
        }
        if (ideaUpdateDto.ProblemStatement != null)
        {
            idea.ProblemStatement = ideaUpdateDto.ProblemStatement;
        }
        if (ideaUpdateDto.ProposedSolution != null)
        {
            idea.ProposedSolution = ideaUpdateDto.ProposedSolution;
        }
        if (ideaUpdateDto.UseCase != null)
        {
            idea.UseCase = ideaUpdateDto.UseCase;
        }
        if (ideaUpdateDto.InnovationCategory != null)
        {
            idea.InnovationCategory = ideaUpdateDto.InnovationCategory;
        }
        if (ideaUpdateDto.SubCategory != null)
        {
            idea.SubCategory = ideaUpdateDto.SubCategory;
        }
        if (ideaUpdateDto.TechnologyInvolved != null)
        {
            idea.TechnologyInvolved = ideaUpdateDto.TechnologyInvolved;
        }
        if (ideaUpdateDto.Notes != null)
        {
            idea.Notes = ideaUpdateDto.Notes;
        }
        //Parse the status string and convert it to type IdeaStatus enum
        if (ideaUpdateDto.Status != null)
        {
            IdeaStatus _newStatus;

            if (Enum.TryParse(ideaUpdateDto.Status, true, out IdeaStatus newStatus))
            {
                _newStatus = newStatus;
            }
            else
            {
                _logger.LogError("Invalid status string {statusString} provided for idea {idea}", ideaUpdateDto.Status, idea.ProblemStatement);
                return BadRequest(ApiResponse.Fail("Parsing failed. Invalid status string provided"));
            }
        }

        var updatedIdea = new IdeaDetailsDto
        {
            Title = idea.Title,
            StrategicAlignment = idea.StrategicAlignment,
            ProblemStatement = idea.ProblemStatement,
            ProposedSolution = idea.ProposedSolution,
            UseCase = idea.UseCase,
            InnovationCategory = idea.InnovationCategory,
            SubCategory = idea.SubCategory,
            TechnologyInvolved = idea.TechnologyInvolved,
            Notes = idea.Notes,
            Score = idea.Score,
            Author = idea.User.DisplayName,
            Group = idea.Group.Name,
            Status = idea.Status.ToString(),
            IsPromotedToProject = idea.IsPromotedToProject
        };

        //save it all
        idea.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Idea {ideaProblemStatement} updated by {userEmail}", idea.ProblemStatement, userEmail);
        return Ok(ApiResponse.Ok("Idea updated", updatedIdea));
    }

    //Promote an idea to a project
    [Authorize(Policy = "GroupAdminOnly")]
    [HttpPost("promote-idea")]
    public async Task<IActionResult> PromoteIdea(int groupId, int ideaId)
    {
        //Fetch user info
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogError("User not authenticated");
            return Unauthorized(ApiResponse.Fail("User not authenticated"));
        }

        //group info
        var group = await _context.Groups.FindAsync(groupId);
        if (group is null)
        {
            _logger.LogError("Group not found");
            return NotFound(ApiResponse.Fail("Group not found"));
        }

        //Promote idea
        var idea = await _context.Ideas.FindAsync(ideaId);
        if (idea is null)
        {
            _logger.LogError("No idea with ID {ideaId} was found", ideaId);
            return NotFound(ApiResponse.Fail("Idea not found"));
        }
        idea.IsPromotedToProject = true;
        idea.Status = IdeaStatus.Closed;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Idea {ideaId} promoted to project", ideaId);
        return Ok(ApiResponse.Ok("Idea promoted to project successfully"));
    }

    [Authorize(Policy = "GroupAdminOnly")]
    [HttpPatch("close-idea")]
    public async Task<IActionResult> CloseIdea([FromQuery] int ideaId)
    {

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("User not authenticated");
                return Unauthorized(ApiResponse.Fail("User not authenticated"));
            }
        var idea = await _context.Ideas.FindAsync(ideaId);
        if (idea == null)
            return NotFound(ApiResponse.Fail("Idea not found"));

        if (idea.Status == IdeaStatus.Closed)
            return BadRequest(ApiResponse.Fail("Idea already closed"));

        idea.Status = IdeaStatus.Closed;
        await _context.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Idea closed successfully"));
    }


    //Delete an idea
    [HttpDelete("{ideaId}")]
    public async Task<IActionResult> DeleteIdea(int ideaId)
    {
        try
        {
            //Fetch user info
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";

            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("User not authenticated");
                return Unauthorized(ApiResponse.Fail("User not authenticated"));
            }

            //fetch idea if user is the idea author
            var idea = await _context.Ideas.Where(i => i.UserId == userId).FirstOrDefaultAsync(i => i.Id == ideaId);
            if (idea is null)
            {
                _logger.LogError("Idea not found");
                return NotFound(ApiResponse.Fail("Idea not found"));
            }

            //Let user delete group if they're admin
            _context.Ideas.Remove(idea);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Idea '{ideaProblemStatement}' has been deleted by '{userEmail}' ", idea.ProblemStatement, userEmail);
            return Ok(ApiResponse.Ok("Idea deleted successfully"));
        }
        catch (Exception e)
        {
            _logger.LogInformation("Failed to delete idea {ideaId}: {e}", ideaId, e);
            return StatusCode(500, ApiResponse.Fail("Failed to delete idea"));
        }
    }
}