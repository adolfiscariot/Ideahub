using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class CommentsDto
{
    [Column (TypeName = "text")]
    public string Content {get; set;} = string.Empty;
}
