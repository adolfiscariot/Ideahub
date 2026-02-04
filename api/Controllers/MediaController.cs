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
    public async Task<IActionResult> UploadMedia([FromForm] MediaDto mediaDto, int? ideaId = null, int? commentId = null, int? projectId = null)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("User not authenticated");
                return Unauthorized(ApiResponse.Fail("User not authenticated"));
            }

            // if file is null but MediaType provided block 
            if (mediaDto.File == null || mediaDto.File.Length == 0)
            {
                return BadRequest(ApiResponse.Fail("File is required when uploading media"));
            }

            var media = new Media
            {
                FilePath = await _mediaService.SaveFileAsync(mediaDto.File),// helper to save locally or cloud
                MediaType = mediaDto.MediaType,
                UserId = userId,
                IdeaId = ideaId,       
                CommentId = commentId,
                ProjectId = projectId
            };

            _context.Media.Add(media);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Media uploaded by {userId}", userId);
            return Ok(ApiResponse.Ok("Media uploaded successfully", new { media.Id, media.FilePath, media.MediaType }));
        }
        catch (Exception e)
        {
            _logger.LogError("Failed to upload media: {e}", e);
            return BadRequest(ApiResponse.Fail("Failed to upload media"));
        }
    }

    // View media (all for a specific idea/comment/project)
    [HttpGet("view-media")]
    public async Task<IActionResult> ViewMedia(int? ideaId = null, int? commentId = null, int? projectId = null)
    {
        var query = _context.Media.AsQueryable();

        if (ideaId.HasValue) query = query.Where(m => m.IdeaId == ideaId.Value);
        if (commentId.HasValue) query = query.Where(m => m.CommentId == commentId.Value);
        if (projectId.HasValue) query = query.Where(m => m.ProjectId == projectId.Value);

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

            // allow only uploader to delete
            if (media.UserId != userId)
                return Unauthorized(ApiResponse.Fail("Not authorized to delete this media"));
                
            _context.Media.Remove(media);
            await _context.SaveChangesAsync();

            // Also delete the file from disk/cloud
            await _mediaService.DeleteFileAsync(media.FilePath);

            return Ok(ApiResponse.Ok("Media deleted successfully"));
        }
        catch (Exception e)
        {
            _logger.LogError("Failed to delete media: {e}", e);
            return StatusCode(500, ApiResponse.Fail("Failed to delete media"));
        }
    }
}
