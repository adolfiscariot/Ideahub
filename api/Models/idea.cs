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
    public string Title {get; set;} = string.Empty;

    [Required]
    [Column (TypeName = "text")]
    public string Description {get; set;} = string.Empty;

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
}

public enum IdeaStatus 
{
    Open = 0,
    Closed = 1,
}