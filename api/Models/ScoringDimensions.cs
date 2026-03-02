using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class ScoringDimensions
{
    [Key]
    public int Id { get; set; }

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
    public float Score { get; set; }

    [Required]
    [Column(TypeName = "text")]
    public string ReviewerComments { get; set; } = string.Empty;

    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public int IdeaId { get; set; }

    [ForeignKey("IdeaId")]
    public Idea Idea { get; set; } = null!;
}

public enum StrategicAlignmentScore
{
    Unknown = 0,
    Low = 1,
    Moderate = 2,
    Strong = 3,
}

public enum CustomerImpactScore
{
    Unknown = 0,
    Low = 1,
    Moderate = 2,
    High = 3,
}

public enum FinancialBenefitScore
{
    Unknown = 0,
    Low = 1,
    Moderate = 2,
    High = 3,
}

public enum FeasibilityScore
{
    Unknown = 0,
    VeryDifficult = 1,
    Moderate = 2,
    High = 3,
}

public enum TimeToValueScore
{
    Unknown = 0,
    SixToTwelve = 1,
    ThreeToSix = 2,
    UnderThreeMonths = 3,
}

public enum CostScore
{
    Unknown = 0,
    High = 1,
    Moderate = 2,
    Low = 3,
}

public enum EffortScore
{
    Unknown = 0,
    High = 1,
    Moderate = 2,
    Low = 3,
}

public enum RiskScore
{
    Unknown = 0,
    High = 1,
    Moderate = 2,
    Low = 3,
}

public enum ScalabilityScore
{
    Unknown = 0,
    Low = 1,
    Moderate = 2,
    High = 3,
}

public enum DifferentiationScore
{
    Unknown = 0,
    LowUniqueness = 1,
    ModerateUniqueness = 2,
    HighDifferentiation = 3,
}

public enum SustainabilityScore
{
    Unknown = 0,
    MinimalBenefit = 1,
    ModerateBenefit = 2,
    StrongBenefit = 3,
}

public enum ConfidenceScore
{
    Unknown = 0,
    Low = 1,
    Moderate = 2,
    High = 3,
}
