using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class BusinessCase
{
    [Key]
    public int Id { get; set; }

    [Required]
    [Column(TypeName = "text")]
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

    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public int IdeaId { get; set; }

    [ForeignKey("IdeaId")]
    public Idea Idea { get; set; } = null!;
}

public enum ImpactScope 
{ 
    Unknown = 0,
    Department = 1, 
    OrganizationWide = 2, 
    External = 3, 
}

public enum RiskLevel 
{ 
    Unknown = 0,
    Low = 1, 
    Medium = 2, 
    High = 3 
}

public enum EvaluationStatus 
{ 
    Unknown = 0,
    FeasibilityResearch = 1,
    Approved = 2, 
    Rejected = 3, 
}

public enum ResponsibleDepartment 
{ 
    Unknown = 0,
    Finance = 1, 
    IT = 2, 
    Operations = 3, 
    MarketingAndSales = 4, 
    StrategyAndCompliance = 5 
}

public enum ActionStep
{ 
    Unknown = 0,
    PrototypeDevelopment = 1, 
    StakeholderReview = 2, 
    PilotLaunch = 3, 
    MarketFeasibilityStudy = 4, 
    RolloutPlanning = 5 
}

public enum BusinessCaseResult 
{ 
    Unknown = 0,
    InProgress = 1, 
    PilotStage = 2, 
    AwaitingResults = 3 
}

public enum Verdict 
{ 
    Unknown = 0,
    Approved = 1, 
    AwaitingReview = 2, 
    Park = 3 
}
