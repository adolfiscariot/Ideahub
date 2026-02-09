using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class PasswordReset
{
	[Key]
	public Guid Id { get; set; } = Guid.NewGuid();

	[Required]
	public string UserId { get; set; } = string.Empty;

	[Required]
	[MaxLength(128)]
	public string TokenHash { get; set; } = string.Empty;

	[Required]
	public DateTime ExpiresAt { get; set; }

	[Required]
	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

	public DateTime? UsedAt { get; set; }

	public bool Used { get; set; } = false;

	// [MaxLength(45)]
	// public string? RequestIp { get; set; }

	// [MaxLength(512)]
	// public string? RequestUserAgent { get; set; }

	// Navigation
	public IdeahubUser? User { get; set; }
}
