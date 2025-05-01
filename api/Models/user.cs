using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace api.Models;

public class User : IdentityUser
{
    [Required]
    public string DisplayName {get; set;} = string.Empty;

    [Required]
    [DataType(DataType.DateTime)]
    public DateTime CreatedAt {get; set;}

    //Navigation Properties
    public ICollection<UserGroup> UserGroups {get; set;} = new List<UserGroup>();
    public ICollection<Idea> Ideas {get; set;} = new List<Idea>();
    public ICollection<Project> ProjectsCreated {get; set;} = new List<Project>();
    public ICollection<Project> ProjectsOverseen {get; set;} = new List<Project>();
}