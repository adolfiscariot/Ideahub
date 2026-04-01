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
[Route("api/[controller]")]
[Authorize]
public class MediaController : ControllerBase
{
    private readonly UserManager<IdeahubUser> _userManager;
    private readonly ILogger<MediaController> _logger;
    private readonly IdeahubDbContext _context;
    private readonly IMediaFileService _mediaService;

    public MediaController(ILogger<MediaController> logger, IdeahubDbContext context, UserManager<IdeahubUser> userManager, IMediaFileService mediaService)
    {
        _logger = logger;
        _context = context;
        _userManager = userManager;
        _mediaService = mediaService;
    }


    // Upload media
    [HttpPost("upload-media")]
    public async Task<IActionResult> UploadMedia([FromForm] MediaDto mediaDto, int? ideaId = null, int? commentId = null, int? projectId = null, int? projectTaskId = null, int? subTaskId = null, int? timesheetId = null)
    {
        string? savedFilePath = null;
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("User not authenticated");
                return Unauthorized(ApiResponse.Fail("User not authenticated"));
            }

            // STRICT ONE-SCOPE RULE
            var scopeCount = new[] { ideaId, commentId, projectId, projectTaskId, subTaskId, timesheetId }.Count(id => id.HasValue);
            if (scopeCount > 1)
            {
                return BadRequest(ApiResponse.Fail("Only one parent scope (Idea, Project, Task, etc.) is allowed per request."));
            }

            if (!await HasAccessToScope(ideaId, commentId, projectId, projectTaskId, subTaskId, timesheetId, userId))
            {
                _logger.LogWarning("User {userId} attempted unauthorized media upload to current scope", userId);
                return StatusCode(403, ApiResponse.Fail("You do not have permission to upload media to this resource."));
            }

            // if file is null but MediaType provided block 
            if (mediaDto.File == null || mediaDto.File.Length == 0)
            {
                _logger.LogError("File is required when uploading media");
                return BadRequest(ApiResponse.Fail("File is required when uploading media"));
            }

            // File size validation
            const long maxFileSize = 20 * 1024 * 1024;
            if (mediaDto.File.Length > maxFileSize)
            {
                _logger.LogError("File size exceeds 20MB limit");
                return BadRequest(ApiResponse.Fail("File size exceeds 20MB limit"));
            }

            // File type validation
            if (!IsValidFileType(mediaDto.File.FileName, mediaDto.MediaType))
            {
                return BadRequest(ApiResponse.Fail($"Invalid file type for {mediaDto.MediaType}"));
            }

            savedFilePath = await _mediaService.SaveFileAsync(mediaDto.File);

            var media = new Media
            {
                FilePath = savedFilePath,
                MediaType = mediaDto.MediaType,
                UserId = userId,
                IdeaId = ideaId,       
                CommentId = commentId,
                ProjectId = projectId,
                ProjectTaskId = projectTaskId,
                SubTaskId = subTaskId,
                TimesheetId = timesheetId
            };

            _context.Media.Add(media);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Media uploaded by {userId}", userId);
            return Ok(ApiResponse.Ok("Media uploaded successfully", new { media.Id, media.FilePath, media.MediaType }));
        }
        catch (Exception e)
        {
            // Clean up orphan file if it was saved since we save file before updating db
            if (!string.IsNullOrEmpty(savedFilePath))
                await _mediaService.DeleteFileAsync(savedFilePath);

            _logger.LogError("Failed to upload media: {e}", e);
            return BadRequest(ApiResponse.Fail("Failed to upload media"));
        }
    }

    // View media (all for a specific idea/comment/project)
    [HttpGet("view-media")]
    public async Task<IActionResult> ViewMedia(int? ideaId = null, int? commentId = null, int? projectId = null, int? projectTaskId = null, int? subTaskId = null, int? timesheetId = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(ApiResponse.Fail("User not authenticated"));

        // STRICT ONE-SCOPE RULE
        var scopeCount = new[] { ideaId, commentId, projectId, projectTaskId, subTaskId, timesheetId }.Count(id => id.HasValue);
        if (scopeCount > 1)
        {
            return BadRequest(ApiResponse.Fail("Only one search scope (Idea, Project, Task, etc.) is allowed per request."));
        }

        if (!await HasAccessToScope(ideaId, commentId, projectId, projectTaskId, subTaskId, timesheetId, userId))
        {
            _logger.LogWarning("User {userId} attempted unauthorized media view for current scope", userId);
            return StatusCode(403, ApiResponse.Fail("You do not have permission to view media for this resource."));
        }

        var query = _context.Media.AsQueryable();

        if (ideaId.HasValue) query = query.Where(m => m.IdeaId == ideaId.Value);
        if (commentId.HasValue) query = query.Where(m => m.CommentId == commentId.Value);
        if (projectId.HasValue) query = query.Where(m => m.ProjectId == projectId.Value);
        
        // Ensure the sub task belongs to the correct project task
        if (projectTaskId.HasValue && subTaskId.HasValue)
        {
            query = query.Where(m => 
                m.SubTaskId == subTaskId.Value && 
                _context.SubTasks.Any(st => 
                    st.Id == subTaskId.Value && 
                    st.ProjectTaskId == projectTaskId.Value
                )
            );
        }
        else if (projectTaskId.HasValue)
        {
            query = query.Where(m =>
                m.ProjectTaskId == projectTaskId.Value || 
                (m.SubTaskId.HasValue &&
                    _context.SubTasks.Any(st =>
                        st.Id == m.SubTaskId.Value &&
                        st.ProjectTaskId == projectTaskId.Value
                    )
                )
            );
        }
        else if (subTaskId.HasValue)
        {
            query = query.Where(m => m.SubTaskId == subTaskId.Value);
        }

        if (timesheetId.HasValue) query = query.Where(m => m.TimesheetId == timesheetId.Value);

        var mediaList = await query
            .Select(m => new { m.Id, m.FilePath, m.MediaType, m.CreatedAt })
            .ToListAsync();

        return Ok(ApiResponse.Ok($"{mediaList.Count} media items found", mediaList));
    }

    // Delete media
    [HttpDelete("{mediaId}")]
    public async Task<IActionResult> DeleteMedia(int mediaId)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized(ApiResponse.Fail("User not authenticated"));

            var media = await _context.Media.FindAsync(mediaId);
            if (media == null)
                return NotFound(ApiResponse.Fail("Media not found"));

            // only uploader has permission to delete
            if (media.UserId != userId)
                return Unauthorized(ApiResponse.Fail("Not authorized to delete this media"));
                

            // Also delete the file from disk/cloud
            var fileDeleted = await _mediaService.DeleteFileAsync(media.FilePath);
            if (!fileDeleted)
                _logger.LogWarning("Failed to delete file at {FilePath}", media.FilePath);

            _context.Media.Remove(media);
            await _context.SaveChangesAsync();
            
            return Ok(ApiResponse.Ok("Media deleted successfully"));
        }
        catch (Exception e)
        {
            _logger.LogError("Failed to delete media: {e}", e);
            return StatusCode(500, ApiResponse.Fail("Failed to delete media"));
        }
    }

    private bool IsValidFileType(string fileName, MediaType mediaType)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();

        switch (mediaType)
        {
            case MediaType.Image:
                return new[] { ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp" }.Contains(extension);
            case MediaType.Video:
                return new[] { ".mp4", ".mov", ".avi", ".wmv" }.Contains(extension);
            case MediaType.Document:
                return new[] { ".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx" }.Contains(extension);
            default:
                return false;
        }
    }

    private async Task<bool> HasAccessToScope(int? ideaId, int? commentId, int? projectId, int? projectTaskId, int? subTaskId, int? timesheetId, string userId)
    {
        // Resolve Comment to its parent Idea or Task
        if (commentId.HasValue)
        {
            var comment = await _context.Comments
                .Include(c => c.Idea)
                .FirstOrDefaultAsync(c => c.Id == commentId.Value);

            if (comment == null) return false;

            // If it's an idea comment, authorize against the idea
            var idea = comment.Idea;
            if (idea == null) return false;

            if (idea.UserId == userId) return true;
            return await _context.UserGroups.AnyAsync(ug => ug.GroupId == idea.GroupId && ug.UserId == userId);
        }

        // Timesheet access check 
        if (timesheetId.HasValue)
        {
            return await HasTimesheetAccess(timesheetId.Value, userId);
        }

        // Project Task / SubTask Access check
        if (projectTaskId.HasValue || subTaskId.HasValue)
        {
            var targetTaskId = projectTaskId;

            // If only subTaskId is provided, find the parent ProjectTask
            if (!targetTaskId.HasValue && subTaskId.HasValue)
            {
                targetTaskId = await _context.SubTasks
                    .Where(st => st.Id == subTaskId.Value)
                    .Select(st => st.ProjectTaskId)
                    .FirstOrDefaultAsync();
            }

            if (!targetTaskId.HasValue || targetTaskId == 0) return false;

            var projectTask = await _context.ProjectTasks
                .Include(t => t.Project)
                .Include(t => t.TaskAssignees)
                .Include(t => t.SubTasks)
                    .ThenInclude(st => st.SubTaskAssignees)
                .FirstOrDefaultAsync(t => t.Id == targetTaskId.Value && !t.IsDeleted);

            if (projectTask == null) return false;

            // Overseer, Assignee, or SubTask Assignee
            var canAccessTask = projectTask.Project.OverseenByUserId == userId ||
                                projectTask.TaskAssignees.Any(ta => ta.UserId == userId) ||
                                projectTask.SubTasks.Any(st => st.SubTaskAssignees.Any(sta => sta.UserId == userId));
            
            if (canAccessTask) return true;

            // Group Member
            var isGroupMember = await _context.UserGroups.AnyAsync(ug => ug.GroupId == projectTask.Project.GroupId && ug.UserId == userId);
            return isGroupMember;
        }

        // 4. Project-only access check
        if (projectId.HasValue)
        {
            var project = await _context.Projects.FindAsync(projectId.Value);
            if (project == null || project.IsDeleted) return false;

            if (project.OverseenByUserId == userId) return true;
            return await _context.UserGroups.AnyAsync(ug => ug.GroupId == project.GroupId && ug.UserId == userId);
        }

        // Idea-only access check
        if (ideaId.HasValue)
        {
            var idea = await _context.Ideas.FindAsync(ideaId.Value);
            if (idea == null) return false;

            if (idea.UserId == userId) return true;
            return await _context.UserGroups.AnyAsync(ug => ug.GroupId == idea.GroupId && ug.UserId == userId);
        }
        return true;
    }

    private async Task<bool> HasTimesheetAccess(int timesheetId, string userId)
    {
        var timesheet = await _context.Timesheets
            .Include(t => t.Task)
            .ThenInclude(tk => tk.Project)
            .FirstOrDefaultAsync(t => t.Id == timesheetId && !t.IsDeleted);

        if (timesheet == null) return false;

        // 1. Owner check (The person who logged the work)
        if (timesheet.UserId == userId) return true;

        // 2. Project Overseer check
        if (timesheet.Task?.Project?.OverseenByUserId == userId) return true;

        // Safety check: if task hierarchy is incomplete, deny access safely instead of crashing
        if (timesheet.Task?.Project == null) return false;

        // 3. Group Membership check
        var isMember = await _context.UserGroups.AnyAsync(ug => 
            ug.GroupId == timesheet.Task!.Project.GroupId && 
            ug.UserId == userId);
        if (isMember) return true;

        // 4. Task/SubTask Assignee check
        // Check if user is assigned to the specific task or any subtask within the project
        var isAssignee = await _context.ProjectTasks
            .AnyAsync(t => 
                t.ProjectId == timesheet.Task!.ProjectId && 
                !t.IsDeleted && 
                (
                    t.TaskAssignees.Any(ta => ta.UserId == userId) ||
                    t.SubTasks.Any(st => st.SubTaskAssignees.Any(sta => sta.UserId == userId))
                )
            );

        return isAssignee;
    }
}
