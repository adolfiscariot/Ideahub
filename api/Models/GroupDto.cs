using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class GroupDto
{
        [Required]
        [MaxLength(256)]
        public string Name {get; set;} = string.Empty;
        
        [Required]
        [Column(TypeName = "text")]
        public string Description {get; set;} = string.Empty;

        [Required(ErrorMessage = "Group privacy setting is required")]
        public bool IsPublic {get; set;} = true;

}