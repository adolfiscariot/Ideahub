using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class Comment
{
    public int Id { get; set; }

    [Column(TypeName = "text")]
    public string Content { get; set; } = string.Empty;

    [Required]
    [ForeignKey("Idea")]
    public int IdeaId { get; set; }

    [Required]
    [ForeignKey("User")]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.DateTime)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public Idea Idea { get; set; } = null!;
    public IdeahubUser User { get; set; } = null!;
    public ICollection<Media> Media { get; set; } = new List<Media>();

}
