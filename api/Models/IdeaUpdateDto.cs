using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class IdeaUpdateDto
{
    public string? StrategicAlignment { get; set; }
    public string? ProblemStatement { get; set; }
    public string? ProposedSolution { get; set; }
    public string? UseCase { get; set; }
    public string? InnovationCategory { get; set; }
    public string? SubCategory { get; set; }
    public string? TechnologyInvolved { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
}