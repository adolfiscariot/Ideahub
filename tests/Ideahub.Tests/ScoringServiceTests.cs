using api.Data;
using api.Models;
using api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Ideahub.Tests
{
    public class ScoringServiceTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly Mock<ILlmService> _mockLlmService;
        private readonly Mock<ILogger<ScoringService>> _mockLogger;
        private readonly ScoringService _service;

        public ScoringServiceTests()
        {
            // Setup In-Memory DB
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new IdeahubDbContext(options);

            _mockLlmService = new Mock<ILlmService>();
            _mockLogger = new Mock<ILogger<ScoringService>>();

            _service = new ScoringService(_context, _mockLlmService.Object, _mockLogger.Object);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Fact]
        public async Task EvaluateAndStageIdeaAsync_ShouldPromoteToBusinessCase_WhenScoreIsHigh()
        {
            // Arrange
            var idea = new Idea
            {
                Id = 1,
                Title = "AI Idea",
                CurrentStage = ScoringStage.Evaluation,
                UserId = "user1"
            };

            // Add user and idea to DB (to satisfy Query Filters)
            _context.Users.Add(new IdeahubUser { Id = "user1", UserName = "test", Email = "a@a.com", DisplayName = "Test" });
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            _mockLlmService.Setup(l => l.EvaluateIdeaAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync((85.0f, "Great idea!"));

            // Act
            var (score, reasoning) = await _service.EvaluateAndStageIdeaAsync(idea);

            // Assert
            var updatedIdea = await _context.Ideas.FindAsync(1);
            Assert.NotNull(updatedIdea);
            Assert.Equal(85.0f, updatedIdea.Score);
            Assert.Equal("Great idea!", updatedIdea.AiReasoning);
            Assert.Equal(ScoringStage.BusinessCase, updatedIdea.CurrentStage);
        }

        [Fact]
        public async Task EvaluateAndStageIdeaAsync_ShouldReject_WhenScoreIsLow()
        {
            // Arrange
            var idea = new Idea
            {
                Id = 1,
                Title = "Weak Idea",
                CurrentStage = ScoringStage.Evaluation,
                UserId = "user1"
            };

            _context.Users.Add(new IdeahubUser { Id = "user1", UserName = "test", Email = "a@a.com", DisplayName = "Test" });
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            _mockLlmService.Setup(l => l.EvaluateIdeaAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync((40.0f, "Not feasible."));

            // Act
            await _service.EvaluateAndStageIdeaAsync(idea);

            // Assert
            var updatedIdea = await _context.Ideas.FindAsync(1);
            Assert.Equal(ScoringStage.Evaluation, updatedIdea!.CurrentStage);
        }

        [Fact]
        public async Task EvaluateAndStageIdeaAsync_ShouldThrowException_WhenIdeaNotFound()
        {
            // Arrange
            var idea = new Idea { Id = 999 };

            _mockLlmService.Setup(l => l.EvaluateIdeaAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync((50.0f, "Whatever"));

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                _service.EvaluateAndStageIdeaAsync(idea));
        }
    }
}
