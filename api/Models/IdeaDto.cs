using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class IdeaDto
{
    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    [Column(TypeName = "text")]
    public string StrategicAlignment { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "text")]
    public string ProblemStatement { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "text")]
    public string ProposedSolution { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "text")]
    public string UseCase { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    [Column(TypeName = "text")]
    public string InnovationCategory { get; set; } = string.Empty;

    [Column(TypeName = "text")]
    public string? SubCategory { get; set; }

    [Column(TypeName = "text")]
    public string? TechnologyInvolved { get; set; }

    [Column(TypeName = "text")]
    public string? Notes { get; set; }

}
