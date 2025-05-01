using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class Group
{
        public int Id {get; set;}

        [Required]
        public string Name {get; set;} = string.Empty;
        
        [Required]
        public string Description {get; set;} = string.Empty;
        
        [Required]
        public bool IsActive {get; set;}
        
        [Required]
        public DateTime CreatedAt {get; set;} = DateTime.UtcNow;

        //Navigation property between group and usergroup tables (facilitates many-2-many r/ship btwn groups & users)
        public ICollection<UserGroup> UserGroups {get; set;} = new List<UserGroup>();
}