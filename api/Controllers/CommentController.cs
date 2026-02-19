using System.Security.Claims;
using api.Data;
using api.Helpers;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/{controller}")]
[Authorize]
public class CommentController : ControllerBase
{
    private readonly IdeahubDbContext _context;
    private readonly ILogger<ProjectController> _logger;
    private readonly UserManager<IdeahubUser> _userManager;
    private readonly INotificationService _notificationService;

    public CommentController(IdeahubDbContext context, ILogger<ProjectController> logger, UserManager<IdeahubUser> userManager, INotificationService notificationService)
    {
        _context = context;
        _logger = logger;
        _userManager = userManager;
        _notificationService = notificationService;
    }

    [HttpPost("create-comment")]
    public async Task<IActionResult> CreateComment(CommentsDto commentsDto, int IdeaId) 
    {
        try
        {
            _logger.LogInformation("Creating new comment...");

            //Fetch user info
            var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("User id is null. Can't create a new comment");
                return Unauthorized(ApiResponse.Fail("User Id is null"));
            }

            //check if idea exists 
            var idea = await _context.Ideas.FindAsync(IdeaId);
            if (idea is null)
            {
                _logger.LogError("Idea not found");
                return NotFound(ApiResponse.Fail("Idea not found"));
            }

            //Create new comment
            var comment = new Comment
            {
                Content = commentsDto.Content,
                UserId = userId,
                IdeaId = IdeaId
            };

            //add to database
            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("New comment created by {userEmail}", userEmail);

            // Send notification to the idea owner
            if (idea.UserId != userId)
            {
                await _notificationService.SendNotificationAsync(idea.UserId, $"New comment on your idea '{idea.Title}': {comment.Content}", comment.Id);
            }

             return Ok(ApiResponse.Ok(
                $"New comment Created by {userEmail}",
                new {
                    id = comment.Id,
                    content = comment.Content,
                    createdAt = comment.CreatedAt,
                    userId = comment.UserId,
                    ideaId = comment.IdeaId
                }
            ));
        }
        catch (Exception e)
        {
            _logger.LogError("Failed to create comment {e}", e);
            return BadRequest(ApiResponse.Fail("Failed to create comment"));
        }
    }

     //View all comments
    [HttpGet("view-comments")]
    public async Task<IActionResult> ViewComments(int IdeaId)
    {
        //Fetch user
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogError("User Id not found");
            return Unauthorized(ApiResponse.Fail("User Id not found"));
        }

        // Ensure idea exists
        var idea = await _context.Ideas.FindAsync(IdeaId);
        if (idea is null)
        {
            _logger.LogError("Idea not found");
            return NotFound(ApiResponse.Fail("Idea not found"));
        }

        //Fetch ideas and votes
        var comments = await _context.Comments
            .Where(c => c.IdeaId == IdeaId)
            .ToListAsync();

        if (comments.Count == 0)
        {
            _logger.LogInformation("No comments found in Idea: {ideaName}", idea.Title);
            return Ok(ApiResponse.Ok("No comments found", new List<object>()));
        }

        var commentDataToReturn = new List<object>();
        foreach (var comment in comments)
        {
            commentDataToReturn.Add(new {comment.Id, comment.Content, comment.CreatedAt, comment.UserId, comment.IdeaId});
        }
        return Ok(ApiResponse.Ok($"{comments.Count()} Comments found", commentDataToReturn));
}

    // Delete a comment
    [HttpDelete("{commentId}")]
    public async Task<IActionResult> DeleteComment(int commentId)
    {
        // Fetch user
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogError("User Id not found");
            return Unauthorized(ApiResponse.Fail("User Id not found"));
        }

        // Fetch comment
        var comment = await _context.Comments
            .FirstOrDefaultAsync(c => c.Id == commentId);

        if (comment == null)
        {
            _logger.LogError("Comment with Id {commentId} not found", commentId);
            return NotFound(ApiResponse.Fail("Comment not found"));
        }

        // Ensure the logged-in user is the author
        if (comment.UserId != userId)
        {
            _logger.LogError("User {userEmail} attempted to delete comment {commentId} but is not the author", userEmail, commentId);
            return Unauthorized(ApiResponse.Fail("You are not the author of this comment"));
        }

        // Delete comment
        _context.Comments.Remove(comment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Comment {commentId} deleted by {userEmail}", commentId, userEmail);
        return Ok(ApiResponse.Ok("Comment deleted successfully"));
    }

 
}