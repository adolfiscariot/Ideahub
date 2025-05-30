using api.Data;
using api.Models;
using api.Helpers;
using api.Constants;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupController : ControllerBase
{
    private readonly ILogger<GroupController> _logger;
    private readonly IdeahubDbContext _context;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly UserManager<IdeahubUser> _userManager;

    public GroupController(ILogger<GroupController> logger, IdeahubDbContext context, RoleManager<IdentityRole> roleManager, UserManager<IdeahubUser> userManager)
    {
        _logger = logger;
        _context = context;
        _roleManager = roleManager;
        _userManager = userManager;
    }

    //Create A Group
    [HttpPost("create-group")]
    public async Task<IActionResult> CreateGroup(GroupDto groupDto)
    {
        _logger.LogInformation("Group creation starting ...");

        //Fetch user from database
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            _logger.LogError("Group creation failed. User ID not found.");
            return BadRequest(ApiResponse.Fail("Group creation failed. User ID Not Found", new List<string>()));
        }
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            _logger.LogError("Group creation failed. User not found");
           return BadRequest(ApiResponse.Fail("Group creation failed. User Not Found", new List<string>()));
        }
        //Create the group
        var group = new Group
        {
            Name = groupDto.Name,
            Description = groupDto.Description,
            CreatedByUserId = userId
        };

        //Find user email
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email unknown";

        //Store the group in database
        _context.Groups.Add(group);
        await _context.SaveChangesAsync();

        //Change user's role to group admin
        var groupAdmin = await _roleManager.FindByNameAsync(RoleConstants.GroupAdmin);
        if (groupAdmin == null)
        {
            _logger.LogError("Role 'Group Admin' doesn't exist");
            return NotFound(ApiResponse.Fail("Group 'Group Admin' not found", new List<string>()));
        }

        //Make user an admin if they're not one already
        var isInRole = await _userManager.IsInRoleAsync(user, RoleConstants.GroupAdmin);
        if (!isInRole)
        {
            var result = await _userManager.AddToRoleAsync(user, RoleConstants.GroupAdmin);
            if (!result.Succeeded)
            {
                _logger.LogError("Failed to make {userEmail} group admin", userEmail);
                return BadRequest(ApiResponse.Fail($"Failed to make {userEmail} group admin", result.Errors.Select(e => e.Description).ToList()));
            }
            _logger.LogInformation("User {userEmail} made Group Admin", userEmail);
        }
        _logger.LogInformation("New group {groupName} created by {userEmail}", group.Name, userEmail);
        return Ok(ApiResponse.Ok($"New group {group.Name} created by {userEmail}"));
    }

    //Delete Group
    [Authorize(Policy="GroupAdminOnly")]
    [HttpDelete("{groupId}")]
    public async Task<IActionResult> DeleteGroup(int groupId)
    {
        //Fetch user info
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";

        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogError("User not authenticated");
            return Unauthorized(ApiResponse.Fail("User not authenticated", new List<string>()));
        }

        //Find the group
        var group = await _context.Groups.FindAsync(groupId);
        if (group == null)
        {
            _logger.LogError("Group with ID '{groupId}' not found", groupId);
            return BadRequest(ApiResponse.Fail("Group not found", new List<string>()));
        }

        //Check if user is group admin
        if (userId != group.CreatedByUserId)
        {
            _logger.LogError("{userEmail} tried deleting '{groupName}' despite not being Admin", userEmail, group.Name);
            return Unauthorized(ApiResponse.Fail("User is not the group admin", new List<string>()));
        }

        //Let user delete group if they're admin
        _context.Groups.Remove(group);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Group '{groupName}' has been deleted by '{userEmail}' ", group.Name, userEmail);
        return Ok(ApiResponse.Ok($"{group.Name} has been deleted by {userEmail}"));
    }


    //Show Groups
    [HttpGet("view-groups")]
    public async Task<IActionResult> ViewGroups()
    {
        //Fetch groups from database
        var groups = await _context.Groups.Select(g => new { g.Name, g.Description, g.CreatedByUser.DisplayName }).ToListAsync();

        //Check if groups exist
        if (groups == null || !groups.Any())
        {
            _logger.LogError("No groups found");
            return NotFound();
        }

        //Return groups if they exist
        _logger.LogInformation("Groups retrieved successfully");
        return Ok(ApiResponse.Ok("Groups retrieved successfully", groups));
    }

    //Join Group
    [HttpPost("join-group")]
    public async Task<IActionResult> JoinGroup(int groupId)
    {
        //Get user info
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogError("User not authenticated to join group");
            return Unauthorized(ApiResponse.Fail("User not authenticated to join group", new List<string>()));
        }

        //Get group info
        var group = await _context.Groups.FindAsync(groupId);
        if (group == null)
        {
            _logger.LogError("Group not found for user to join");
            return NotFound(ApiResponse.Fail("Group doesn't exist", new List<string>()));
        }
        var groupName = group.Name;

        //Check if user is in group already or has a pending request
        var existingUser = await _context.GroupMembershipRequests.FirstOrDefaultAsync(
                            gmr => gmr.GroupId == groupId && gmr.UserId == userId
                        );
        if (existingUser != null)
        {
            _logger.LogWarning("User {userEmail} made another request to join group {GroupName}", userEmail, groupName);
            return BadRequest(ApiResponse.Fail("You already joined or requested to join this group", new List<string>()));
        }

        //If not create a request for them
        var request = new GroupMembershipRequest
        {
            UserId = userId,
            GroupId = groupId
        };

        //Save the request
        _context.GroupMembershipRequests.Add(request);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {userEmail} just requested to join group {groupName}", userEmail, groupName);
        return Ok(ApiResponse.Ok($"New request to group {groupName} by {userEmail}"));
    }

    //Leave Group
    [HttpPost("leave-group")]
    public async Task<IActionResult> LeaveGroup(int groupId)
    {
        //Get user info
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Email not found";
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            _logger.LogError("User not found");
            return NotFound(ApiResponse.Fail("User Not Found", new List<string>()));
        }

        //Get group info
        var group = await _context.Groups.FindAsync(groupId);
        if (group == null)
        {
            _logger.LogError("Group doesn't exist");
            return NotFound(ApiResponse.Fail("Group not found", new List<string>()));
        }
        var groupName = group.Name;

        //Verify user is in group
        if (!_context.GroupMembershipRequests.Any(gmr => gmr.UserId == userId && gmr.GroupId == groupId))
        {
            return BadRequest(ApiResponse.Fail("You can't leave a group you're not a part of", new List<string>()));
        }

        //Remove them and save the new changes
        var request = await _context.GroupMembershipRequests.FirstOrDefaultAsync(gmr => gmr.UserId == userId && gmr.GroupId == groupId);
        if (request == null)
        {
            _logger.LogWarning("Group Membership Request doesn't exist");
            return BadRequest(ApiResponse.Fail("Group membership doesn't exist", new List<string>()));
        }
        _context.GroupMembershipRequests.Remove(request);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {userEmail} has left group {groupName}", userEmail, groupName);
        return Ok(ApiResponse.Ok($"User {userEmail} has left group {groupName}"));
    }

    //View Individual Group
    [HttpGet("{groupId}")]
    public async Task<IActionResult> ViewGroup(int groupId)
    {
        var group = await _context.Groups.Include(g => g.CreatedByUser).FirstOrDefaultAsync(g => g.Id == groupId);
        if (group == null)
        {
            _logger.LogError("Group not found");
            return NotFound(ApiResponse.Fail("Group not found", new List<string>()));
        }

        _logger.LogInformation("Group {groupName} found", group.Name);
        return Ok(ApiResponse.Ok($"Group {group.Name} found", new
        {
            group.Name,
            group.Description,
            CreatedBy = new
            {
                group.CreatedByUser.DisplayName,
                group.CreatedByUser.Email
            },
            Members = group.UserGroups.Select(ug => new
            {
                ug.User?.DisplayName,
                ug.User?.Email
            }),
            group.CreatedAt
        }));
    }
}