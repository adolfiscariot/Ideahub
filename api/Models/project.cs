using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class Project
{
    public int Id {get; set;}

    [Required]
    [MaxLength (256)]
    public string Title {get; set;} = string.Empty;

    [Required]
    [Column (TypeName = "text")]
    public string Description {get; set;} = string.Empty;

    [Required]
    public ProjectStatus Status {get; set;} = ProjectStatus.Planning;

    [Required]
    [DataType(DataType.DateTime)]
    public DateTime CreatedAt {get; set;} = DateTime.UtcNow;

    [DataType(DataType.DateTime)]
    public DateTime? EndedAt {get; set;}

    public bool IsDeleted {get; set;} = false;
    public DateTime? DeletedAt {get; set;}

    [DataType(DataType.DateTime)]
    public DateTime UpdatedAt {get; set;} = DateTime.UtcNow;

    [Required]
    [ForeignKey ("CreatedByUser")]
    public string CreatedByUserId {get; set;} = string.Empty;

    [Required]
    [ForeignKey ("OverseenByUser")]
    public string OverseenByUserId {get; set;} = string.Empty;

    [Required]
    [ForeignKey ("Idea")]
    public int IdeaId {get; set;}

    [Required]
    [ForeignKey ("Group")]
    public int GroupId {get; set;}


    //Navigation Properties
    public Idea Idea {get; set;} = null!;
    public Group Group {get; set;} = null!;
    public IdeahubUser CreatedByUser {get; set;} = null!;
    public IdeahubUser OverseenByUser {get; set;} = null!;
}

public enum ProjectStatus
{
    Planning = 0,
    Active = 1,
    Completed = 2,
    Shelved = 3,
    Cancelled = 4
}