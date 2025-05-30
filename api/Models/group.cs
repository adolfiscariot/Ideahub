using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class Group
{
        public int Id {get; set;}

        [Required]
        [MaxLength(256)]
        public string Name {get; set;} = string.Empty;
        
        [Required]
        [Column(TypeName = "text")]
        public string Description {get; set;} = string.Empty;

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public DateTime CreatedAt {get; set;} = DateTime.UtcNow;

        [Required]
        [ForeignKey ("CreatedByUser")]
        public string CreatedByUserId {get; set;} = string.Empty;

        public bool IsDeleted {get; set;} = false;
        public string? IsDeletedBy {get; set;}
        public DateTime? DeletedAt {get; set;}

        //Navigation property between group and usergroup tables (facilitates many-2-many r/ship btwn groups & users)
        public ICollection<UserGroup> UserGroups {get; set;} = new List<UserGroup>();
        public ICollection<Idea> Ideas {get; set;} = new List<Idea>();
        public ICollection<Project> Projects {get; set;} = new List<Project>();
        public IdeahubUser CreatedByUser {get; set;} = null!;
        public ICollection<GroupMembershipRequest> GroupMembershipRequests {get; set;} = new List<GroupMembershipRequest>();
}