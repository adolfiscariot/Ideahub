using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class BusinessCaseDto
{
    [Required]
    public string ExpectedBenefits { get; set; } = string.Empty;

    [Required]
    public ImpactScope ImpactScope { get; set; }

    [Required]
    public RiskLevel RiskLevel { get; set; }

    [Required]
    public EvaluationStatus EvaluationStatus { get; set; }

    [Required]
    public ResponsibleDepartment OwnerDepartment { get; set; }

    [Required]
    public ActionStep NextSteps { get; set; }

    [Required]
    public DateOnly DecisionDate { get; set; }

    [Required]
    public int PlannedDurationWeeks { get; set; }

    [Required]
    public BusinessCaseResult CurrentStage { get; set; }

    [Required]
    public Verdict Verdict { get; set; }
}
