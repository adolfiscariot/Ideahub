using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class Idea
{
    public int Id {get; set;}
    
    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    [Column (TypeName = "text")]
    public string StrategicAlignment {get; set;} = string.Empty;

    [Required]
    [Column (TypeName = "text")]
    public string ProblemStatement {get; set;} = string.Empty;

    [Required]
    [Column (TypeName = "text")]
    public string ProposedSolution {get; set;} = string.Empty;

    [Required]
    [Column (TypeName = "text")]
    public string UseCase {get; set;} = string.Empty;

    [Required]
    [MaxLength(256)]
    [Column (TypeName = "text")]
    public string InnovationCategory {get; set;} = string.Empty;

    [Column (TypeName = "text")]
    public string? SubCategory {get; set;}

    [Column (TypeName = "text")]
    public string? TechnologyInvolved {get; set;}

    [Column (TypeName = "text")]
    public string? Notes {get; set;}

    [Required]
    public float Score {get; set;} = 0.0f;

    public bool IsPromotedToProject { get; set; } = false;

    public bool IsDeleted {get; set;} = false;
    public DateTime? DeletedAt {get; set;}
    
    [Required]
    [DataType(DataType.DateTime)]
    public DateTime CreatedAt {get; set;} = DateTime.UtcNow;
    
    [Required]
    [DataType(DataType.DateTime)]
    public DateTime UpdatedAt {get; set;} = DateTime.UtcNow;
    
    [Required]
    public IdeaStatus Status {get; set;} = IdeaStatus.Open;

    [Required]
    public ScoringStage CurrentStage { get; set; } = ScoringStage.Evaluation;

    [Column(TypeName = "text")]
    public string? AiReasoning { get; set; }
    
    [Required]
    [ForeignKey ("User")]
    public string UserId {get; set;} = string.Empty;
    
    [Required]
    [ForeignKey ("Group")]
    public int GroupId {get; set;}

    //Navigation Properties
    public IdeahubUser User {get; set;} = null!;
    public Group Group {get; set;} = null!;
    public ICollection<Project> Projects {get; set;} = new List<Project>();
    public ICollection<Vote> Votes {get; set;} = new List<Vote>();
    public ICollection<Comment> Comments {get; set;} = new List<Comment>();
    public ICollection<Media> Media { get; set; } = new List<Media>();
    public BusinessCase? BusinessCase { get; set; }
    public ScoringDimensions? ScoringDimensions { get; set; }
}

public enum ScoringStage
{
    Evaluation = 0,       // Phase 1 (Automated)
    BusinessCase = 1,     // Phase 2 (Manual)
    ScoringDimensions = 2, // Phase 3 (Manual)
    Accepted = 3,
    Rejected = 4
}

public enum IdeaStatus 
{
    Open = 0,
    Closed = 1,
}