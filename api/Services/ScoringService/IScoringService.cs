using api.Models;

namespace api.Services;

public interface IScoringService
{
    Task<(float Score, string Reasoning)> EvaluateAndStageIdeaAsync(Idea idea);
    void SetStageByScore(Idea idea, float score);
}
