using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class BusinessCaseUpdateDto
{
    public string? ExpectedBenefits { get; set; }

    public ImpactScope? ImpactScope { get; set; }

    public RiskLevel? RiskLevel { get; set; }

    public EvaluationStatus? EvaluationStatus { get; set; }

    public ResponsibleDepartment? OwnerDepartment { get; set; }

    public ActionStep? NextSteps { get; set; }

    public DateOnly? DecisionDate { get; set; }

    public int? PlannedDurationWeeks { get; set; }

    public BusinessCaseResult? CurrentStage { get; set; }

    public Verdict? Verdict { get; set; }
}
