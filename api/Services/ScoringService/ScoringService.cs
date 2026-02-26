using api.Data;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Services;

public class ScoringService : IScoringService
{
    private readonly IdeahubDbContext _context;
    private readonly ILlmService _llmService;
    private readonly ILogger<ScoringService> _logger;

    public ScoringService(IdeahubDbContext context, ILlmService llmService, ILogger<ScoringService> logger)
    {
        _context = context;
        _llmService = llmService;
        _logger = logger;
    }

    public async Task<(float Score, string Reasoning)> EvaluateAndStageIdeaAsync(Idea idea)
    {
        _logger.LogInformation("Starting AI evaluation for idea {IdeaId}", idea.Id);

        var (score, reasoning) = await _llmService.EvaluateIdeaAsync(
            idea.Title,
            idea.StrategicAlignment,
            idea.ProblemStatement,
            idea.ProposedSolution,
            idea.UseCase,
            idea.InnovationCategory
        );

        // Re-fetch from THIS service's DbContext — the passed-in `idea` may be tracked
        // by a different DbContext instance (e.g. IdeaController's), so SaveChangesAsync
        // on this context would have nothing to save, leaving the stage stuck at Evaluation.
        var trackedIdea = await _context.Ideas.FindAsync(idea.Id) ?? idea;

        trackedIdea.Score = score;
        trackedIdea.AiReasoning = reasoning;

        // Stage transition logic
        if (score >= 70)
        {
            trackedIdea.CurrentStage = ScoringStage.BusinessCase;
            _logger.LogInformation("Idea {IdeaId} passed Phase 1 with score {score}. Moving to Business Case stage.", idea.Id, score);
        }
        else
        {
            trackedIdea.CurrentStage = ScoringStage.Rejected;
            _logger.LogInformation("Idea {IdeaId} failed Phase 1 with score {score}. Moving to Rejected stage.", idea.Id, score);
        }

        trackedIdea.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return (score, reasoning);
    }
}
