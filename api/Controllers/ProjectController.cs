using System.Security.Claims;
using api.Data;
using api.Helpers;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/{controller}")]
public class ProjectController : ControllerBase
{
    private readonly IdeahubDbContext _context;
    private readonly ILogger<ProjectController> _logger;
    private readonly UserManager<IdeahubUser> _userManager;

    public ProjectController(IdeahubDbContext context, ILogger<ProjectController> logger, UserManager<IdeahubUser> userManager)
    {
        _context = context;
        _logger = logger;
        _userManager = userManager;
    }

    [Authorize(Policy = "GroupAdminOnly")]
    [HttpPost("create-project")]
    public async Task<IActionResult> CreateProject(int groupId, int ideaId, ProjectDto projectDto)
    {
        try
        {
            //check if idea is promoted to project
            var idea = await _context.Ideas.FindAsync(ideaId);
            if (idea == null)
            {
                _logger.LogError("Idea with ID {ideaId} not found", ideaId);
                return NotFound(ApiResponse.Fail("Idea not found"));
            }
            if (!idea.IsPromotedToProject)
            {
                _logger.LogError("Idea {ideaId} hasn't been promoted to a project yet", ideaId);
                return BadRequest(ApiResponse.Fail("Idea hasn't been promoted to a project yet"));
            }

            //user info
            var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("User Id is null. Can't create a project");
                return Unauthorized(ApiResponse.Fail("User Id is null"));
            }

            //group info
            var group = await _context.Groups.FindAsync(groupId);
            if (group == null)
            {
                _logger.LogError("Group not found for group Id {groupId}", groupId);
                return NotFound(ApiResponse.Fail("Group not found"));
            }

            //Create new Project
            //var user = await _userManager.FindByNameAsync(projectDto.OverseenBy);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == projectDto.OverseenByEmail);
            if (user == null)
            {
                _logger.LogError("No user found with the name {userName}", projectDto.OverseenByEmail);
                return NotFound(ApiResponse.Fail("User not found"));
            }
            var newProject = new Project
            {
                Title = projectDto.Title,
                Description = projectDto.Description,
                CreatedByUserId = userId,
                OverseenByUserId = user.Id,
                IdeaId = ideaId,
                GroupId = groupId,
            };

            await _context.Projects.AddAsync(newProject);
            await _context.SaveChangesAsync();

            _logger.LogInformation("New Project {projectTitle} created", newProject.Title);
            return Ok(ApiResponse.Ok("New project created"));
        }
        catch (Exception e)
        {
            _logger.LogInformation("Failed to create a project based on idea {ideaId}: {e}", e, ideaId);
            return StatusCode(500, ApiResponse.Fail("Failed to create a project"));
        }
    }
}