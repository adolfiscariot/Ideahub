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
    NoAlignment = 1,
    Low = 2,
    Moderate = 3,
    Strong = 4,
    Full = 5
}

public enum CustomerImpactScore
{
    Unknown = 0,
    Minimal = 1,
    Low = 2,
    Moderate = 3,
    High = 4,
    Transformational = 5
}

public enum FinancialBenefitScore
{
    Unknown = 0,
    NoGain = 1,
    Low = 2,
    Moderate = 3,
    High = 4,
    Breakthrough = 5
}

public enum FeasibilityScore
{
    Unknown = 0,
    VeryDifficult = 1,
    Low = 2,
    Moderate = 3,
    High = 4,
    VeryFeasible = 5
}

public enum TimeToValueScore
{
    Unknown = 0,
    Over24Months = 1,
    TwelveToTwentyFour = 2,
    SixToTwelve = 3,
    ThreeToSix = 4,
    UnderThreeMonths = 5
}

public enum CostScore
{
    Unknown = 0,
    VeryHigh = 1,
    High = 2,
    Moderate = 3,
    Low = 4,
    VeryLow = 5
}

public enum EffortScore
{
    Unknown = 0,
    VeryHigh = 1,
    High = 2,
    Moderate = 3,
    Low = 4,
    VeryLow = 5
}

public enum RiskScore
{
    Unknown = 0,
    VeryHigh = 1,
    High = 2,
    Moderate = 3,
    Low = 4,
    VeryLow = 5
}

public enum ScalabilityScore
{
    Unknown = 0,
    NotScalable = 1,
    Low = 2,
    Moderate = 3,
    High = 4,
    FullyScalable = 5
}

public enum DifferentiationScore
{
    Unknown = 0,
    NoDifferentiation = 1,
    LowUniqueness = 2,
    ModerateUniqueness = 3,
    HighDifferentiation = 4,
    UniqueStrongIP = 5
}

public enum SustainabilityScore
{
    Unknown = 0,
    NegativeImpact = 1,
    MinimalBenefit = 2,
    ModerateBenefit = 3,
    StrongBenefit = 4,
    MajorBenefit = 5
}

public enum ConfidenceScore
{
    Unknown = 0,
    VeryLow = 1,
    Low = 2,
    Moderate = 3,
    High = 4,
    VeryHigh = 5
}
