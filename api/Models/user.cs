using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace api.Models;

public class IdeahubUser : IdentityUser
{   
    [Required]
    public string DisplayName {get; set;} = string.Empty;

    [DataType(DataType.DateTime)]
    public DateTime CreatedAt {get; set;}

    [DataType(DataType.DateTime)]
    public DateTime? LastLoginAt {get; set;}

    public bool IsDeleted {get; set;} = false;
    public DateTime? DeletedAt {get; set;}

    //Navigation Properties
    public ICollection<UserGroup> UserGroups {get; set;} = new List<UserGroup>();
    public ICollection<Idea> Ideas {get; set;} = new List<Idea>();
    public ICollection<Project> ProjectsCreated {get; set;} = new List<Project>();
    public ICollection<Project> ProjectsOverseen {get; set;} = new List<Project>();
    public ICollection<Vote> Votes {get; set;} = new List<Vote>();
    public ICollection<Group> GroupsCreated {get; set;}  = new List<Group>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<GroupMembershipRequest> GroupMembershipRequests {get; set;} = new List<GroupMembershipRequest>();
}