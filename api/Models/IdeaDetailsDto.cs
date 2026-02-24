using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class IdeaDetailsDto
{
    public string Title { get; set; } = string.Empty;
    public string StrategicAlignment { get; set; } = string.Empty;
    public string ProblemStatement { get; set; } = string.Empty;
    public string ProposedSolution { get; set; } = string.Empty;
    public string UseCase { get; set; } = string.Empty;
    public string InnovationCategory { get; set; } = string.Empty;
    public string? SubCategory { get; set; }
    public string? TechnologyInvolved { get; set; }
    public string? Notes { get; set; }
    public int Score { get; set; }
    public string Author { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool IsPromotedToProject { get; set; }
}