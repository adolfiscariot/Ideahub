using System;
using System.Threading.Tasks;
using api.Models;

namespace api.Services;

public class MockLlmService : ILlmService
{
    public Task<(int Score, string Reasoning)> EvaluateIdeaAsync(Idea idea)
    {
        // Mock logic: Randomly give a score between 50 and 95
        var random = new Random();
        int score = random.Next(50, 96);
        string reasoning = $"Mock AI evaluation for idea: {idea.ProblemStatement}. The solution looks { (score >= 70 ? "promising" : "weak") } based on organization needs.";
        
        return Task.FromResult((score, reasoning));
    }
}
