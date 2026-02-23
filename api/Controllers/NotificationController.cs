using System.Security.Claims;
using api.Data;
using api.Helpers;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly IdeahubDbContext _context;
    private readonly ILogger<NotificationController> _logger;

    public NotificationController(IdeahubDbContext context, ILogger<NotificationController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // Returns all comment notifications for the logged-in user, newest first
    [HttpGet("my-notifications")]
    public async Task<IActionResult> GetMyNotifications()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(ApiResponse.Fail("User not found"));

        var notifications = await _context.Notifications
            .Where(n => n.RecipientId == userId)
            .Include(n => n.Comment)
                .ThenInclude(c => c.Idea)
            .Include(n => n.Comment)
                .ThenInclude(c => c.User)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new
            {
                n.Id,
                n.IsRead,
                n.CreatedAt,
                comment = new
                {
                    n.Comment.Id,
                    n.Comment.Content,
                    n.Comment.CreatedAt,
                    commenterName = n.Comment.User.DisplayName,
                    ideaTitle = n.Comment.Idea != null ? n.Comment.Idea.Title : null,
                    ideaId = n.Comment.IdeaId,
                    groupId = n.Comment.Idea.GroupId
                }
            })
            .ToListAsync();

        return Ok(ApiResponse.Ok($"{notifications.Count} notification(s) found", notifications));
    }

    // Returns the count of unread notifications for the badge
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(ApiResponse.Fail("User not found"));

        var count = await _context.Notifications
            .CountAsync(n => n.RecipientId == userId && !n.IsRead);

        return Ok(ApiResponse.Ok("Unread count fetched", new { count }));
    }

    // Marks a single notification as read
    [HttpPatch("mark-read/{id}")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(ApiResponse.Fail("User not found"));

        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.RecipientId == userId);

        if (notification is null)
            return NotFound(ApiResponse.Fail("Notification not found"));

        if (notification.IsRead)
            return Ok(ApiResponse.Ok("Already marked as read"));

        notification.IsRead = true;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Notification {id} marked as read by user {userId}", id, userId);
        return Ok(ApiResponse.Ok("Notification marked as read"));
    }

    // Marks all of the user's notifications as read
    [HttpPatch("mark-all-read")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(ApiResponse.Fail("User not found"));

        var unread = await _context.Notifications
            .Where(n => n.RecipientId == userId && !n.IsRead)
            .ToListAsync();

        if (unread.Count == 0)
            return Ok(ApiResponse.Ok("No unread notifications"));

        unread.ForEach(n => n.IsRead = true);
        await _context.SaveChangesAsync();

        _logger.LogInformation("{count} notifications marked as read for user {userId}", unread.Count, userId);
        return Ok(ApiResponse.Ok($"{unread.Count} notification(s) marked as read"));
    }
}