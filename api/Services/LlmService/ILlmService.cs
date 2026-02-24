using System.Threading.Tasks;
using api.Models;

namespace api.Services;

public interface ILlmService
{
    Task<(int Score, string Reasoning)> EvaluateIdeaAsync(Idea idea);
}
