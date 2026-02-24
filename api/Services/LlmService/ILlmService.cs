using System.Threading.Tasks;
using api.Models;

namespace api.Services;

public interface ILlmService
{
    Task<(int Score, string Reasoning)> EvaluateIdeaAsync(string title, string alignment, string problem, string solution, string useCase, string innovationCategory);
}
