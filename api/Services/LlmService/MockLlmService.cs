using System;
using System.Threading.Tasks;
using api.Models;

namespace api.Services;

public class MockLlmService : ILlmService
{
    public Task<(float Score, string Reasoning)> EvaluateIdeaAsync(string title, string alignment, string problem, string solution, string useCase, string innovationCategory)
    {
        // Mock logic: Randomly give a score between 1 and 10
        var random = new Random();
        int rawScore = random.Next(1, 11); // 1-10
        float finalScore = rawScore * 10; // Get percentage
        
        string reasoning = $"Mock AI evaluation for idea: {title}. The solution looks { (finalScore >= 70 ? "promising" : "weak") } based on organization needs. Raw score: {rawScore}/10.";
        
        return Task.FromResult((finalScore, reasoning));
    }
}
