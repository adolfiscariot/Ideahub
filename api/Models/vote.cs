using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class Vote
{
    public int Id {get; set;}

    public bool IsDeleted {get; set;} = false;
    public DateTime? DeletedAt {get; set;}

    [Required]
    [DataType (DataType.DateTime)]    
    public DateTime VotedAt {get; set;} = DateTime.UtcNow;

    [Required]
    [ForeignKey ("User")]
    public string UserId {get; set;} = string.Empty;

    [Required]
    [ForeignKey ("Idea")]
    public int IdeaId {get; set;}


    //Navigation Properties
    public IdeahubUser User {get; set;} = null!;
    public Idea Idea {get; set;} = null!;
}