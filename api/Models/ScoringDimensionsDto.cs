using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class ScoringDimensionsDto
{
    [Required]
    public StrategicAlignmentScore StrategicAlignment { get; set; }

    [Required]
    public CustomerImpactScore CustomerImpact { get; set; }

    [Required]
    public FinancialBenefitScore FinancialBenefit { get; set; }

    [Required]
    public FeasibilityScore Feasibility { get; set; }

    [Required]
    public TimeToValueScore TimeToValue { get; set; }

    [Required]
    public CostScore Cost { get; set; }

    [Required]
    public EffortScore Effort { get; set; }

    [Required]
    public RiskScore Risk { get; set; }

    [Required]
    public ScalabilityScore Scalability { get; set; }

    [Required]
    public DifferentiationScore Differentiation { get; set; }

    [Required]
    public SustainabilityScore SustainabilityImpact { get; set; }

    [Required]
    public ConfidenceScore ProjectConfidence { get; set; }

    [Required]
    public string ReviewerComments { get; set; } = string.Empty;
}
