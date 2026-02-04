using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class MediaDto
{
    public IFormFile? File { get; set; }

    [Required]
    public MediaType MediaType { get; set; }
}
