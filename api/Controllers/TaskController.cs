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
public class TaskController : ControllerBase
{
    private readonly IdeahubDbContext _context;
    private readonly ILogger<TaskController> _logger;
    private readonly UserManager<IdeahubUser> _userManager;

    public TaskController(IdeahubDbContext context, ILogger<TaskController> logger, UserManager<IdeahubUser> userManager)
    {
        _context = context;
        _logger = logger;
        _userManager = userManager;
    }

    #region Task Endpoints

    [HttpPost("create/{projectId}")]
    public async Task<IActionResult> CreateTask(int projectId, TaskDto taskDto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var project = await _context.Projects.FindAsync(projectId);

            if (project == null) 
            {
                return NotFound(ApiResponse.Fail("Project not found"));
            }

            // Access Control: Only Overseer can create tasks
            if (project.OverseenByUserId != userId)
            {
                _logger.LogError("Only the project overseer can create tasks");
                return StatusCode(403, ApiResponse.Fail("Only the Project Overseer can create tasks."));
            }

            var task = new ProjectTask
            {
                Title = taskDto.Title,
                Description = taskDto.Description,
                StartDate = taskDto.StartDate.HasValue ? DateTime.SpecifyKind(taskDto.StartDate.Value, DateTimeKind.Utc) : null,
                EndDate = taskDto.EndDate.HasValue ? DateTime.SpecifyKind(taskDto.EndDate.Value, DateTimeKind.Utc) : null,
                Labels = taskDto.Labels,
                ProjectId = projectId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Assign task assignees
            task.TaskAssignees = taskDto.TaskAssignees
                .Select(assigneeId => new TaskAssignee 
                {
                    UserId = assigneeId,
                    ProjectTask = task
                })
                .ToList();

            _context.ProjectTasks.Add(task);
            _logger.LogInformation("Assignees to insert: {count}", taskDto.TaskAssignees?.Count ?? 0);
            await _context.SaveChangesAsync();

            var response = new TaskDetailsDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                StartDate = task.StartDate,
                EndDate = task.EndDate,
                Labels = task.Labels,
                IsCompleted = task.IsCompleted,
                TaskAssignees = task.TaskAssignees.Select(ta => ta.UserId).ToList(),
                ProjectId = task.ProjectId
            };

            _logger.LogInformation("Task created successfully");
            return Ok(ApiResponse.Ok("Task created successfully", response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating task");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }

    [HttpGet("get-tasks/{projectId}")]
    public async Task<IActionResult> GetProjectTasks(int projectId)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var project = await _context.Projects
                .Include(p => p.Tasks)
                    .ThenInclude(t => t.SubTasks)
                        .ThenInclude(st => st.Media)
                .Include(p => p.Tasks)
                    .ThenInclude(t => t.SubTasks)
                        .ThenInclude(st => st.SubTaskAssignees)
                .Include(p => p.Tasks)
                    .ThenInclude(t => t.Media)
                .Include(p => p.Tasks)
                    .ThenInclude(t => t.TaskAssignees)
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null) 
            {
                return NotFound(ApiResponse.Fail("Project not found"));
            }

            // Check if user has access to workspace (Overseer, Task Assignee, or Subtask Assignee)
            var isTaskAssignee = project.Tasks.Any(t => (t.TaskAssignees ?? new List<TaskAssignee>()).Any(ta => ta.UserId == userId));
            var isSubTaskAssignee = project.Tasks.Any(t => t.SubTasks.Any(st => (st.SubTaskAssignees ?? new List<SubTaskAssignee>()).Any(sta => sta.UserId == userId)));

            if (project.OverseenByUserId != userId && !isTaskAssignee && !isSubTaskAssignee)
            {
                return StatusCode(403, ApiResponse.Fail("You do not have permission to access this project workspace."));
            }

            var tasks = project.Tasks.Where(t => !t.IsDeleted).Select(t => new TaskDetailsDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                StartDate = t.StartDate,
                EndDate = t.EndDate,
                Labels = t.Labels,
                IsCompleted = t.IsCompleted,
                TaskAssignees = (t.TaskAssignees ?? new List<TaskAssignee>()).Select(ta => ta.UserId).ToList(),
                ProjectId = t.ProjectId,
                MediaCount = t.Media.Count,
                SubTasks = t.SubTasks.Select(st => new SubTaskDetailsDto
                {
                    Id = st.Id,
                    Title = st.Title,
                    Description = st.Description,
                    StartDate = st.StartDate,
                    EndDate = st.EndDate,
                    IsCompleted = st.IsCompleted,
                    SubTaskAssignees = (st.SubTaskAssignees ?? new List<SubTaskAssignee>()).Select(sta => sta.UserId).ToList(),
                    ProjectTaskId = st.ProjectTaskId,
                    ParentSubTaskId = st.ParentSubTaskId,
                    MediaCount = st.Media?.Count ?? 0
                }).ToList()
            }).ToList();

            return Ok(ApiResponse.Ok("Tasks retrieved", tasks));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching tasks");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }

    [HttpPut("update-task/{taskId}")]
    public async Task<IActionResult> UpdateTask(int taskId, TaskUpdateDto taskDto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var task = await _context.ProjectTasks.Include(t => t.Project).Include(t => t.TaskAssignees).FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null) 
            {
                return NotFound(ApiResponse.Fail("Task not found"));
            }

            if (task.Project.OverseenByUserId != userId && !(task.TaskAssignees ?? new List<TaskAssignee>()).Any(ta => ta.UserId == userId))
            {
                return StatusCode(403, ApiResponse.Fail("Not authorized to update this task."));
            }

            if (taskDto.Title != null) task.Title = taskDto.Title;
            if (taskDto.Description != null) task.Description = taskDto.Description;
            if (taskDto.StartDate != null) task.StartDate = DateTime.SpecifyKind(taskDto.StartDate.Value, DateTimeKind.Utc);
            if (taskDto.EndDate != null) task.EndDate = DateTime.SpecifyKind(taskDto.EndDate.Value, DateTimeKind.Utc);
            if (taskDto.Labels != null) task.Labels = taskDto.Labels;
            if (taskDto.IsCompleted != null)
            {
                if (taskDto.IsCompleted.Value)
                {
                    bool hasIncompleteSubTasks = await _context.SubTasks
                        .AnyAsync(st => st.ProjectTaskId == taskId && !st.IsCompleted);
                    if (hasIncompleteSubTasks)
                    {
                        return BadRequest(ApiResponse.Fail("Cannot complete task until all subtasks are finished."));
                    }
                }
                task.IsCompleted = taskDto.IsCompleted.Value;
            }
            if (taskDto.TaskAssignees != null)
            {
                // Synchronize task assignees
                var existingAssignees = (task.TaskAssignees ?? new List<TaskAssignee>()).ToList();
                var newTaskAssigneeIds = taskDto.TaskAssignees;

                // Remove assignees no longer in the list
                foreach (var existing in existingAssignees)
                {
                    if (!newTaskAssigneeIds.Contains(existing.UserId))
                    {
                        _context.TaskAssignees.Remove(existing);
                    }
                }

                // Add new assignees
                foreach (var newId in newTaskAssigneeIds)
                {
                    if (!existingAssignees.Any(ea => ea.UserId == newId))
                    {
                        task.TaskAssignees?.Add(new TaskAssignee { ProjectTaskId = taskId, UserId = newId });
                    }
                }
            }

            task.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Task updated successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating task");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }

    [HttpDelete("delete-task/{taskId}")]
    public async Task<IActionResult> DeleteTask(int taskId)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var task = await _context.ProjectTasks.Include(t => t.Project).Include(t => t.TaskAssignees).FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null) 
            {
                return NotFound(ApiResponse.Fail("Task not found"));
            }

            if (task.Project.OverseenByUserId != userId)
            {
                return StatusCode(403, ApiResponse.Fail("Only the Project Overseer can delete tasks."));
            }

            task.IsDeleted = true;
            task.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Task deleted (soft-delete)"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting task");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }

    #endregion

    #region SubTask Endpoints

    [HttpPost("create-subtask/{taskId}")]
    public async Task<IActionResult> CreateSubTask(int taskId, SubTaskDto subTaskDto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var task = await _context.ProjectTasks.Include(t => t.Project).FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null) 
            {
                return NotFound(ApiResponse.Fail("Parent task not found"));
            }

            // Restricted to Task Assignees and Project Overseer
            if (task.Project.OverseenByUserId != userId && !(task.TaskAssignees ?? new List<TaskAssignee>()).Any(ta => ta.UserId == userId))
            {
                return StatusCode(403, ApiResponse.Fail("Not authorized to create sub-tasks here."));
            }

            // A subtask's parent must belong to the same task
            if (subTaskDto.ParentSubTaskId.HasValue)
            {
                var parentSubTask = await _context.SubTasks.FindAsync(subTaskDto.ParentSubTaskId.Value);
                if (parentSubTask == null)
                {
                    return NotFound(ApiResponse.Fail("Parent subtask not found."));
                }
                if (parentSubTask.ProjectTaskId != taskId)
                {
                    return BadRequest(ApiResponse.Fail("Parent subtask must belong to the same project task."));
                }
            }

            var subTask = new SubTask
            {
                Title = subTaskDto.Title,
                Description = subTaskDto.Description,
                StartDate = subTaskDto.StartDate.HasValue ? DateTime.SpecifyKind(subTaskDto.StartDate.Value, DateTimeKind.Utc) : null,
                EndDate = subTaskDto.EndDate.HasValue ? DateTime.SpecifyKind(subTaskDto.EndDate.Value, DateTimeKind.Utc) : null,
                ProjectTaskId = taskId,
                ParentSubTaskId = subTaskDto.ParentSubTaskId,
                IsCompleted = false
            };

            subTask.SubTaskAssignees = subTaskDto.SubTaskAssignees
                .Select(userId => new SubTaskAssignee { 
                    UserId = userId,
                    SubTask = subTask
                    })
                .ToList();

            _context.SubTasks.Add(subTask);
            await _context.SaveChangesAsync();

            var response = new SubTaskDetailsDto
            {
                Id = subTask.Id,
                Title = subTask.Title,
                Description = subTask.Description,
                StartDate = subTask.StartDate,
                EndDate = subTask.EndDate,
                IsCompleted = subTask.IsCompleted,
                SubTaskAssignees = subTask.SubTaskAssignees.Select(sta => sta.UserId).ToList(),
                ProjectTaskId = subTask.ProjectTaskId,
                ParentSubTaskId = subTask.ParentSubTaskId
            };

            return Ok(ApiResponse.Ok("Sub-task created", response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating sub-task");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }

    [HttpPut("update-subtask/{subTaskId}")]
    public async Task<IActionResult> UpdateSubTask(int subTaskId, SubTaskUpdateDto subTaskDto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var subTask = await _context.SubTasks
                .Include(st => st.SubTaskAssignees)
                .Include(st => st.ProjectTask)
                    .ThenInclude(t => t.Project)
                .FirstOrDefaultAsync(st => st.Id == subTaskId);

            if (subTask == null) 
            {
                return NotFound(ApiResponse.Fail("Sub-task not found"));
            }

            if (subTask.ProjectTask.Project.OverseenByUserId != userId && 
                !(subTask.ProjectTask.TaskAssignees ?? new List<TaskAssignee>()).Any(ta => ta.UserId == userId) && 
                !(subTask.SubTaskAssignees ?? new List<SubTaskAssignee>()).Any(sta => sta.UserId == userId))
            {
                return StatusCode(403, ApiResponse.Fail("Not authorized to update this sub-task."));
            }

            if (subTaskDto.Title != null) subTask.Title = subTaskDto.Title;
            if (subTaskDto.Description != null) subTask.Description = subTaskDto.Description;
            if (subTaskDto.StartDate != null) subTask.StartDate = DateTime.SpecifyKind(subTaskDto.StartDate.Value, DateTimeKind.Utc);
            if (subTaskDto.EndDate != null) subTask.EndDate = DateTime.SpecifyKind(subTaskDto.EndDate.Value, DateTimeKind.Utc);
            if (subTaskDto.IsCompleted != null)
            {
                if (subTaskDto.IsCompleted.Value)
                {
                    bool hasIncompleteChildren = await _context.SubTasks
                        .AnyAsync(st => st.ParentSubTaskId == subTaskId && !st.IsCompleted);
                    if (hasIncompleteChildren)
                    {
                        return BadRequest(ApiResponse.Fail("Cannot complete subtask until all its children are finished."));
                    }
                }
                subTask.IsCompleted = subTaskDto.IsCompleted.Value;
            }
            if (subTaskDto.SubTaskAssignees != null)
            {
                // Synchronize subtask assignees
                var existingAssignees = (subTask.SubTaskAssignees ?? new List<SubTaskAssignee>()).ToList();
                var newSubTaskAssigneeIds = subTaskDto.SubTaskAssignees;

                // Remove assignees no longer in the list
                foreach (var existing in existingAssignees)
                {
                    if (!newSubTaskAssigneeIds.Contains(existing.UserId))
                    {
                        _context.SubTaskAssignees.Remove(existing);
                    }
                }

                // Add new assignees
                foreach (var newId in newSubTaskAssigneeIds)
                {
                    if (!existingAssignees.Any(ea => ea.UserId == newId))
                    {
                        subTask.SubTaskAssignees?.Add(new SubTaskAssignee { SubTaskId = subTaskId, UserId = newId });
                    }
                }
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.Ok("Sub-task updated"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating sub-task");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }

    [HttpDelete("delete-subtask/{subTaskId}")]
    public async Task<IActionResult> DeleteSubTask(int subTaskId)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var subTask = await _context.SubTasks
                .Include(st => st.ProjectTask)
                    .ThenInclude(t => t.Project)
                .Include(st => st.ProjectTask)
                    .ThenInclude(t => t.TaskAssignees)
                .FirstOrDefaultAsync(st => st.Id == subTaskId);

            if (subTask == null) 
            {
                return NotFound(ApiResponse.Fail("Sub-task not found"));
            }

            if (subTask.ProjectTask.Project.OverseenByUserId != userId && 
                !(subTask.ProjectTask.TaskAssignees ?? new List<TaskAssignee>()).Any(ta => ta.UserId == userId))
            {
                return StatusCode(403, ApiResponse.Fail("Not authorized to delete this sub-task."));
            }

            _context.SubTasks.Remove(subTask);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.Ok("Sub-task deleted permanently"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting sub-task");
            return StatusCode(500, ApiResponse.Fail("Internal server error"));
        }
    }

    #endregion
}
