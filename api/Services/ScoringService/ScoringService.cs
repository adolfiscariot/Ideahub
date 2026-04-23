using api.Data;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Services;

public class ScoringService : IScoringService
{
    private readonly IdeahubDbContext _context;
    private readonly ILlmService _llmService;
    private readonly ILogger<ScoringService> _logger;
    public const float SCORING_THRESHOLD = 70.0f;

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

        var trackedIdea = await _context.Ideas.FindAsync(idea.Id);
        if (trackedIdea is null)
        {
            _logger.LogError("Idea {IdeaId} was not found in ScoringService context.", idea.Id);
            throw new InvalidOperationException($"Idea {idea.Id} was not found.");
        }

        trackedIdea.Score = score;
        trackedIdea.AiReasoning = reasoning;

        // Stage transition logic delegated to shared helper
        SetStageByScore(trackedIdea, score);

        trackedIdea.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return (score, reasoning);
    }

    public void SetStageByScore(Idea idea, float score)
    {
        idea.Score = score;
        if (score >= SCORING_THRESHOLD)
        {
            idea.CurrentStage = ScoringStage.BusinessCase;
            //_logger.LogInformation("Idea {IdeaId} staged as Business Case with score {score}.", idea.Id, score);
            _logger.LogInformation("Idea staged as Business Case");
        }
        else
        {
            idea.CurrentStage = ScoringStage.Evaluation;
            //_logger.LogInformation("Idea {IdeaId} staged as Evaluation with score {score}.", idea.Id, score);
            _logger.LogInformation("Idea staged as Evaluation");
        }
    }
}
