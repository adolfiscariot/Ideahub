using System.Security.Claims;
using api.Data;
using api.Helpers;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimesheetController : ControllerBase
{
    private readonly IdeahubDbContext _context;
    private readonly ILogger<TimesheetController> _logger;

    public TimesheetController(IdeahubDbContext context, ILogger<TimesheetController> logger)
    {
        _context = context;
        _logger = logger;
    }

    #region -- TIMESHEET CREATION & BULK LOGGING --

    // POST: api/timesheet/log-timesheet?taskId={taskId}
    [HttpPost("log-timesheet")]
    public async Task<IActionResult> LogTimesheet([FromQuery] int taskId, [FromBody] TimesheetDto createDto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse.Fail("User ID not found in token"));
            }

            // Verify task exists
            var taskExists = await _context.ProjectTasks.AnyAsync(t => t.Id == taskId && !t.IsDeleted);
            if (!taskExists)
            {
                return NotFound(ApiResponse.Fail("Task not found"));
            }

            var timesheet = new Timesheet
            {
                TaskId = taskId,
                UserId = userId,
                WorkDate = createDto.WorkDate.ToUniversalTime(),
                Description = createDto.Description,
                HoursSpent = createDto.HoursSpent,
                Comments = createDto.Comments,
                HasBlocker = createDto.HasBlocker,
                BlockerDescription = createDto.BlockerDescription,
                BlockerSeverity = createDto.BlockerSeverity,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Timesheets.Add(timesheet);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Work log created for task {TaskId} by user {UserId}", taskId, userId);

            return Ok(ApiResponse.Ok("Work log created successfully", new { id = timesheet.Id }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log work for task {TaskId}", taskId);
            return StatusCode(500, ApiResponse.Fail("An error occurred while creating the work log"));
        }
    }

    // POST: api/timesheet/bulk-timesheets?projectId=123
    [HttpPost("bulk-timesheets")]
    public async Task<IActionResult> BulkLogTimesheets([FromQuery] int projectId, [FromBody] BulkTimesheetRequestDto request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse.Fail("User ID not found in token"));
            }

            if (request?.Logs == null || !request.Logs.Any())
            {
                return BadRequest(ApiResponse.Fail("No logs provided"));
            }

            // Verify tasks belong to the project
            var taskIds = request.Logs.Select(l => l.TaskId).Where(id => id.HasValue).Select(id => id!.Value).ToList();
            var validTasks = await _context.ProjectTasks
                .Where(t => t.ProjectId == projectId && taskIds.Contains(t.Id))
                .Select(t => t.Id)
                .ToListAsync();

            var timesheets = new List<Timesheet>();
            foreach (var log in request.Logs)
            {
                if (log.TaskId == null || !validTasks.Contains(log.TaskId.Value)) continue;

                timesheets.Add(new Timesheet
                {
                    TaskId = log.TaskId.Value,
                    UserId = userId,
                    WorkDate = log.WorkDate.ToUniversalTime(),
                    Description = log.Description,
                    HoursSpent = log.HoursSpent,
                    Comments = log.Comments,
                    HasBlocker = log.HasBlocker,
                    BlockerDescription = log.BlockerDescription,
                    BlockerSeverity = log.BlockerSeverity,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            if (timesheets.Any())
            {
                _context.Timesheets.AddRange(timesheets);
                await _context.SaveChangesAsync();
            }

            var createdIds = timesheets.Select(t => t.Id).ToList();

            return Ok(ApiResponse.Ok($"{timesheets.Count} work logs created successfully", createdIds));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to bulk log work for project {ProjectId}", projectId);
            return StatusCode(500, ApiResponse.Fail("An error occurred while creating work logs"));
        }
    }
    #endregion

    #region -- TIMESHEET MODIFICATION (EDIT/DELETE) --

    // PUT: api/timesheet/update-timesheet/{id}
    [HttpPut("update-timesheet/{id}")]
    public async Task<IActionResult> UpdateTimesheet(int id, [FromBody] TimesheetUpdateDto updateDto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var entry = await _context.Timesheets.FindAsync(id);

            if (entry == null || entry.IsDeleted)
            {
                return NotFound(ApiResponse.Fail("Work log not found"));
            }

            if (entry.UserId != userId)
            {
                return Forbid();
            }

            if (updateDto.WorkDate.HasValue) entry.WorkDate = updateDto.WorkDate.Value.ToUniversalTime();
            if (updateDto.Description != null) entry.Description = updateDto.Description;
            if (updateDto.HoursSpent.HasValue) entry.HoursSpent = updateDto.HoursSpent.Value;
            if (updateDto.Comments != null) entry.Comments = updateDto.Comments;
            if (updateDto.HasBlocker.HasValue) entry.HasBlocker = updateDto.HasBlocker.Value;
            if (updateDto.BlockerDescription != null) entry.BlockerDescription = updateDto.BlockerDescription;
            if (updateDto.BlockerSeverity.HasValue) entry.BlockerSeverity = updateDto.BlockerSeverity;

            entry.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Work log updated successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update work log {Id}", id);
            return StatusCode(500, ApiResponse.Fail("An error occurred while updating the work log"));
        }
    }

    // DELETE: api/timesheet/delete-timesheet/{id}
    [HttpDelete("delete-timesheet/{id}")]
    public async Task<IActionResult> DeleteTimesheet(int id)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var entry = await _context.Timesheets.FindAsync(id);

            if (entry == null || entry.IsDeleted)
            {
                return NotFound(ApiResponse.Fail("Work log not found"));
            }

            if (entry.UserId != userId)
            {
                return Forbid();
            }

            entry.IsDeleted = true;
            entry.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Work log deleted successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete work log {Id}", id);
            return StatusCode(500, ApiResponse.Fail("An error occurred while deleting the work log"));
        }
    }
    #endregion

    #region -- TIMESHEET DATA RETRIEVAL --

    // GET: api/timesheet/view-timesheets?taskId={taskId}
    [HttpGet("view-timesheets")]
    public async Task<IActionResult> GetTaskTimesheets([FromQuery] int taskId)
    {
        try
        {
            var logs = await _context.Timesheets
                .Include(ts => ts.User)
                .Where(ts => ts.TaskId == taskId && !ts.IsDeleted)
                .OrderByDescending(ts => ts.WorkDate)
                .ThenByDescending(ts => ts.CreatedAt)
                .Select(ts => new TimesheetDetailsDto
                {
                    Id = ts.Id,
                    TaskId = ts.TaskId,
                    UserId = ts.UserId,
                    UserName = ts.User.DisplayName,
                    WorkDate = ts.WorkDate,
                    Description = ts.Description,
                    HoursSpent = ts.HoursSpent,
                    Comments = ts.Comments,
                    HasBlocker = ts.HasBlocker,
                    BlockerDescription = ts.BlockerDescription,
                    BlockerSeverity = ts.BlockerSeverity,
                    CreatedAt = ts.CreatedAt
                })
                .ToListAsync();

            return Ok(ApiResponse.Ok($"{logs.Count} logs found", logs));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch logs for task {TaskId}", taskId);
            return StatusCode(500, ApiResponse.Fail("An error occurred while fetching work logs"));
        }
    }

    // GET: api/timesheet/my-timesheets?projectId=123
    [HttpGet("my-timesheets")]
    public async Task<IActionResult> GetMyTimesheets([FromQuery] int? projectId)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse.Fail("User ID not found"));
            }

            var query = _context.Timesheets
                .Include(ts => ts.Task)
                .Include(ts => ts.Media)
                .Where(ts => ts.UserId == userId && !ts.IsDeleted);

            if (projectId.HasValue)
            {
                query = query.Where(ts => ts.Task.ProjectId == projectId.Value);
            }

            var logs = await query
                .OrderByDescending(ts => ts.WorkDate)
                .ThenByDescending(ts => ts.CreatedAt)
                .Select(ts => new TimesheetDto
                {
                    Id = ts.Id,
                    TaskId = ts.TaskId,
                    TaskTitle = ts.Task.Title,
                    WorkDate = ts.WorkDate,
                    Description = ts.Description,
                    HoursSpent = ts.HoursSpent,
                    HasBlocker = ts.HasBlocker,
                    BlockerDescription = ts.BlockerDescription,
                    BlockerSeverity = ts.BlockerSeverity,
                    CreatedAt = ts.CreatedAt,
                    MediaCount = ts.Media != null ? ts.Media.Count : 0,
                    UserId = ts.UserId
                })
                .ToListAsync();

            return Ok(ApiResponse.Ok("Personal logs retrieved", logs));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch personal logs");
            return StatusCode(500, ApiResponse.Fail("An error occurred"));
        }
    }

    // GET: api/timesheet/project-timesheets?projectId=123
    [HttpGet("project-timesheets")]
    public async Task<IActionResult> GetProjectTimesheets([FromQuery] int projectId)
    {
        try
        {
            var logs = await _context.Timesheets
                .Include(ts => ts.Task)
                .Include(ts => ts.User)
                .Include(ts => ts.Media)
                .Where(ts => ts.Task.ProjectId == projectId && !ts.IsDeleted)
                .OrderByDescending(ts => ts.WorkDate)
                .ThenByDescending(ts => ts.CreatedAt)
                .Select(ts => new TimesheetDto
                {
                    Id = ts.Id,
                    TaskId = ts.TaskId,
                    TaskTitle = ts.Task.Title,
                    UserName = ts.User.DisplayName,
                    WorkDate = ts.WorkDate,
                    Description = ts.Description,
                    HoursSpent = ts.HoursSpent,
                    HasBlocker = ts.HasBlocker,
                    BlockerDescription = ts.BlockerDescription,
                    BlockerSeverity = ts.BlockerSeverity,
                    CreatedAt = ts.CreatedAt,
                    MediaCount = ts.Media != null ? ts.Media.Count : 0,
                    UserId = ts.UserId
                })
                .ToListAsync();

            return Ok(ApiResponse.Ok($"Logs for project {projectId} retrieved", logs));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch project logs for {ProjectId}", projectId);
            return StatusCode(500, ApiResponse.Fail("An error occurred"));
        }
    }
    #endregion


    // GET: api/timesheet/relevant-tasks?projectId=123
    [HttpGet("relevant-tasks")]
    public async Task<IActionResult> GetMyRelevantTasks([FromQuery] int projectId)
    {
        try {
            // Fetch all active tasks for the project
            var tasks = await _context.ProjectTasks
                .Where(t => t.ProjectId == projectId && !t.IsDeleted && !t.IsCompleted)
                .Select(t => new { t.Id, t.Title })
                .ToListAsync();

            return Ok(ApiResponse.Ok("Tasks retrieved", tasks)); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch relevant tasks for project {ProjectId}", projectId);
            return StatusCode(500, ApiResponse.Fail("An error occurred while fetching tasks"));
        }
    }

    // GET: api/timesheet/project-team?projectId=123
    [HttpGet("project-team")]
    public async Task<IActionResult> GetProjectTeam([FromQuery] int projectId)
    {
        try
        {
            var project = await _context.Projects
                .Include(p => p.Tasks)
                .ThenInclude(t => t.SubTasks)
                .FirstOrDefaultAsync(p => p.Id == projectId && !p.IsDeleted);

            if (project == null) return NotFound(ApiResponse.Fail("Project not found"));

            var teamIds = new HashSet<string> { project.OverseenByUserId };

            foreach (var task in project.Tasks.Where(t => !t.IsDeleted))
            {
                if (task.AssigneeIds != null)
                {
                    foreach (var id in task.AssigneeIds) teamIds.Add(id);
                }

                foreach (var subtask in task.SubTasks)
                {
                    if (subtask.AssigneeIds != null)
                    {
                        foreach (var id in subtask.AssigneeIds) teamIds.Add(id);
                    }
                }
            }

            var teamMembers = await _context.Users
                .Where(u => teamIds.Contains(u.Id))
                .Select(u => new { Id = u.Id, Name = u.DisplayName })
                .ToListAsync();

            return Ok(ApiResponse.Ok("Project team retrieved", teamMembers));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch project team for {ProjectId}", projectId);
            return StatusCode(500, ApiResponse.Fail("An error occurred while fetching the team roster"));
        }
    }
}
