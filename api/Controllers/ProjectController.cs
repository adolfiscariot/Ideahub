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
[Authorize]
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

    //Create a project
    [Authorize(Policy = "GroupAdminOnly")]
    [HttpPost("create-project")]
    public async Task<IActionResult> CreateProject(int groupId, int ideaId, ProjectDto projectDto)
    {
        try
        {
            //check if idea is promoted to project
            var idea = await _context.Ideas.FindAsync(ideaId);
            if (idea is null)
            {
                _logger.LogError("Create Project: Idea with ID {ideaId} not found", ideaId);
                return NotFound(ApiResponse.Fail("Idea not found"));
            }
            if (!idea.IsPromotedToProject)
            {
                _logger.LogError("Create Project: Idea {ideaId} hasn't been promoted to a project yet", ideaId);
                return BadRequest(ApiResponse.Fail("Idea hasn't been promoted to a project yet"));
            }

            //user info
            var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("Create Project: User Id is null. Can't create a project");
                return Unauthorized(ApiResponse.Fail("User Id is null"));
            }

            //group info
            var group = await _context.Groups.FindAsync(groupId);
            if (group is null)
            {
                _logger.LogError("Create Project: Group not found for group Id {groupId}", groupId);
                return NotFound(ApiResponse.Fail("Group not found"));
            }

            //Create new Project
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == projectDto.OverseenByEmail);
            if (user is null)
            {
                _logger.LogError("Create Project: No user found with the name {userName}", projectDto.OverseenByEmail);
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

            _logger.LogInformation("Create Project: New Project {projectTitle} created", newProject.Title);
            return Ok(ApiResponse.Ok("New project created"));
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Create Project: Failed to create a project based on idea {ideaId}", ideaId);
            return StatusCode(500, ApiResponse.Fail("Failed to create a project"));
        }
    }

    //View all projects
    [HttpGet("view-projects")]
    public async Task<IActionResult> ViewProjects(int groupId)
    {
        try
        {
            //user info
            var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("View Project: User Id is null. Can't view projects");
                return Unauthorized(ApiResponse.Fail("User Id is null"));
            }

            //group info
            var group = await _context.Groups.FindAsync(groupId);
            if (group is null)
            {
                _logger.LogError("View Project: Group not found for group Id {groupId}", groupId);
                return NotFound(ApiResponse.Fail("Group not found"));
            }

            //check if user is in the group that the project is in
            var groupMember = await _context.UserGroups.AnyAsync(ug => ug.GroupId == groupId && ug.UserId == userId);
            if (!groupMember)
            {
                _logger.LogError("View Project: User {userEmail} does not belong in {groupName}", userEmail, group.Name);
                return StatusCode(403, ApiResponse.Fail("User is not in group"));
            }

            //fetch the projects
            var projects = await _context.Projects
                .Include(p => p.Group)
                .Include(p => p.OverseenByUser)
                .Include(p => p.Idea)
                .Where(p => p.GroupId == groupId)
                .ToListAsync();
            if (projects.Count == 0)
            {
                _logger.LogWarning("View Project: No projects from group {groupName}", group.Name);
                return NotFound(ApiResponse.Fail("No projects found"));
            }

            //display the projects
            var projectList = projects.Select(project => new
            {
                project.Title,
                project.Description,
                OverseenByUserName = project.OverseenByUser?.DisplayName,
                Status = project.Status.ToString(),
                IdeaName = project.Idea?.Title,
                GroupName = project.Group?.Name
            }).ToList();

            _logger.LogInformation("View Project: {projectsCount} projects from {groupName} found", projects.Count, group.Name);
            return Ok(ApiResponse.Ok($"{projects.Count} projects found", projectList));
        }
        catch (Exception e)
        {
            _logger.LogError(e, "View Projects: Can't view projects in group {groupId}", groupId);
            return StatusCode(500, ApiResponse.Fail("An internal server error occurred while fetching projects. Please try again"));
        }
    }

    //View all global projects (Public groups + User's private groups)
    [HttpGet("all")]
    public async Task<IActionResult> GetAllProjects()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                return Unauthorized(ApiResponse.Fail("User Id is null"));
            }

            // Fetch projects:
            // 1. Project is not deleted
            // 2. AND (Group is Public OR User is member of Group)
            var projects = await _context.Projects
                .Include(p => p.Group)
                .Include(p => p.OverseenByUser)
                .Include(p => p.Idea)
                .Where(p => 
                    !p.IsDeleted && 
                    (p.Group.IsPublic || p.Group.UserGroups.Any(ug => ug.UserId == userId)))
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var projectList = projects.Select(project => new
            {
                project.Id,
                project.Title,
                project.Description,
                project.CreatedAt,
                project.EndedAt,
                OverseenByUserName = project.OverseenByUser?.DisplayName ?? "Unknown",
                OverseenByUserId = project.OverseenByUserId,
                Status = (int)project.Status,
                IdeaName = project.Idea?.Title,
                GroupName = project.Group?.Name,
                IsPublic = project.Group?.IsPublic
            }).ToList();

            return Ok(ApiResponse.Ok($"{projects.Count} projects found", projectList));
        }
        catch (Exception e)
        {
            _logger.LogError(e, "GetAllProjects: Failed to fetch projects");
            return StatusCode(500, ApiResponse.Fail("An internal server error occurred"));
        }
    }

    //Open a project
    [HttpGet("open-project")]
    public async Task<IActionResult> OpenProject(int groupId, int projectId)
    {
        try
        {
            //Fetch user
            var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("Open Project: User Id not found");
                return Unauthorized(ApiResponse.Fail("User Id not found"));
            }

            //Fetch group
            var group = await _context.Groups.FindAsync(groupId);
            if (group is null)
            {
                _logger.LogError("Open Project: Group not found");
                return NotFound(ApiResponse.Fail("Group not found"));
            }

            //Ensure user is in group
            var isAMember = await _context.UserGroups.AnyAsync(ug => ug.GroupId == groupId && ug.UserId == userId);
            if (!isAMember)
            {
                _logger.LogError("Open Project: User {userEmail} isn't in the group {groupName}", userEmail, group.Name);
                return StatusCode(403, ApiResponse.Fail("User not in group"));
            }

            //Fetch project
            var project = await _context.Projects
                .Include(p => p.OverseenByUser)
                .Include(p => p.Idea)
                .Include(p => p.Group)
                .FirstOrDefaultAsync(p => p.Id == projectId);
            if (project is null)
            {
                _logger.LogError("Open Project: Project with id {projectId} not found", projectId);
                return NotFound(ApiResponse.Fail("Project not found"));
            }

            //display project
            var projectDataToDisplay = new ProjectDetailsDto
            {
                Title = project.Title,
                Description = project.Description,
                Status = project.Status.ToString(),
                OverseenByUserName = project.OverseenByUser.DisplayName,
                IdeaName = project.Idea.Title,
                GroupName = project.Group.Name
            };

            _logger.LogInformation("Open Project: Project {projectTitle} found", project.Title);
            return Ok(ApiResponse.Ok("Project found", projectDataToDisplay));
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Open Project: Failed to open project {projectId}", projectId);
            return StatusCode(500, ApiResponse.Fail("Failed to open project"));
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(int id, ProjectUpdateDto projectUpdateDto)
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        _logger.LogInformation("Update Project: Request for ID {id} by {userEmail}", id, userEmail);

        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                return Unauthorized(ApiResponse.Fail("User ID missing"));
            }

            var project = await _context.Projects
                .Include(p => p.OverseenByUser)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project is null)
            {
                _logger.LogWarning("Update Project: Project with Id {id} not found", id);
                return NotFound(ApiResponse.Fail($"Project with ID {id} not found"));
            }

            if (project.CreatedByUserId != userId && project.OverseenByUserId != userId)
            {
                _logger.LogWarning("Update Project: User {userEmail} has no permission to update project {projectName}", userEmail, project.Title);
                return StatusCode(403, ApiResponse.Fail("User not authorized to update project"));
            }

            if (!string.IsNullOrWhiteSpace(projectUpdateDto.Title))
            {
                project.Title = projectUpdateDto.Title;
            }

            if (!string.IsNullOrWhiteSpace(projectUpdateDto.Description))
            {
                project.Description = projectUpdateDto.Description;
            }

            string? newOverseerDisplayName = null;
            if (!string.IsNullOrWhiteSpace(projectUpdateDto.OverseenByUserEmail))
            {
                var newUser = await _userManager.FindByEmailAsync(projectUpdateDto.OverseenByUserEmail);
                if (newUser is null)
                {
                    _logger.LogWarning("Update Project: User with email {email} not found", projectUpdateDto.OverseenByUserEmail);
                    return NotFound(ApiResponse.Fail("Specified overseer user not found"));
                }
                project.OverseenByUserId = newUser.Id;
                newOverseerDisplayName = newUser.DisplayName;
            }

            if (!string.IsNullOrWhiteSpace(projectUpdateDto.Status))
            {
                if (Enum.TryParse<ProjectStatus>(projectUpdateDto.Status, true, out var newStatus))
                {
                    project.Status = newStatus;
                }
                else
                {
                    _logger.LogWarning("Update Project: Unable to parse status '{status}'", projectUpdateDto.Status);
                    return BadRequest(ApiResponse.Fail("Invalid project status"));
                }
            }

            if (projectUpdateDto.EndedAt.HasValue)
            {
                if (projectUpdateDto.EndedAt.Value < project.CreatedAt)
                {
                    return BadRequest(ApiResponse.Fail("End date cannot be before creation date"));
                }
                project.EndedAt = projectUpdateDto.EndedAt;
            }

            project.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var projectUpdateData = new ProjectDetailsDto
            {
                Title = project.Title,
                Description = project.Description,
                OverseenByUserName = newOverseerDisplayName ?? project.OverseenByUser?.DisplayName ?? "Unknown",
                Status = project.Status.ToString()
            };

            _logger.LogInformation("Update Project: Project {id} updated successfully", id);
            return Ok(ApiResponse.Ok("Project updated successfully", projectUpdateData));
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Update Project: Error updating project {id}", id);
            return StatusCode(500, ApiResponse.Fail("Failed to update project. Please try again later."));
        }
    }

    //Delete a project
    [HttpDelete("{projectId}")]
    public async Task<IActionResult> DeleteProject(int projectId)
    {
        try
        {
            //fetch user info
            var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                _logger.LogError("Delete Project: User ID missing in token");
                return Unauthorized(ApiResponse.Fail("User ID missing"));
            }

            //fetch project
            var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == projectId);
            if (project is null)
            {
                _logger.LogWarning("Delete Project: Project with Id {projectId} not found", projectId);
                return NotFound(ApiResponse.Fail("Project not found"));
            }

            //check if user created project
            if (project.CreatedByUserId != userId)
            {
                _logger.LogWarning("Delete Project: User {userEmail} has no permission to update project {projectName}", userEmail, project.Title);
                return StatusCode(403, ApiResponse.Fail("User not authorized to update project"));
            }

            //delete project
            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Delete Project: Project {projectTitle} deleted by {userEmail}", project.Title, userEmail);
            return Ok(ApiResponse.Ok("Project deleted successfully"));
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Delete Project: Project {projectId} failed to delete", projectId);
            return StatusCode(500, ApiResponse.Fail("An internal server error occurred while deleting the project. Please try again"));
        }
    }
}