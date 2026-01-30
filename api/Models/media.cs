using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class Media
{
    public int Id { get; set; }

    [Required]
    [MaxLength(1024)]
    public string FilePath { get; set; } = string.Empty;

    [Required]
    public MediaType MediaType { get; set; }

    // Foreign Keys
    [ForeignKey("Idea")]
    public int? IdeaId { get; set; }

    [Required]
    [ForeignKey("User")]
    public string UserId { get; set; } = string.Empty;

    [ForeignKey("Project")]
    public int? ProjectId { get; set; }

    [ForeignKey("Comment")]
    public int? CommentId { get; set; }

    [Required]
    [DataType(DataType.DateTime)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public Idea? Idea { get; set; }
    public IdeahubUser User { get; set; } = null!;
    public Project? Project { get; set; }
    public Comment? Comment { get; set; }
}

public enum MediaType
{
    Image,
    Video,
    Document
}
