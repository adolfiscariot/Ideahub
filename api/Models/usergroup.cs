using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class UserGroup 
{
    [ForeignKey ("User")]
    public string? UserId {get; set;} = string.Empty;

    [ForeignKey ("Group")]
    public int? GroupId {get; set;}

    [Required]
    [DataType (DataType.DateTime)]
    public DateTime JoinedAt {get; set;} = DateTime.UtcNow;

    public bool IsGroupAdmin { get; set; } = false;


    //Navigation Properties
    public IdeahubUser? User {get; set;} = null!;
    public Group? Group {get; set;} = null!;
}