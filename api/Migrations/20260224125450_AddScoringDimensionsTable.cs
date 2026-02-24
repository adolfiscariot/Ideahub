using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Ideahub.Migrations
{
    /// <inheritdoc />
    public partial class AddScoringDimensionsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ScoringDimensions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StrategicAlignment = table.Column<string>(type: "text", nullable: false),
                    CustomerImpact = table.Column<string>(type: "text", nullable: false),
                    FinancialBenefit = table.Column<string>(type: "text", nullable: false),
                    Feasibility = table.Column<string>(type: "text", nullable: false),
                    TimeToValue = table.Column<string>(type: "text", nullable: false),
                    Cost = table.Column<string>(type: "text", nullable: false),
                    Effort = table.Column<string>(type: "text", nullable: false),
                    Risk = table.Column<string>(type: "text", nullable: false),
                    Scalability = table.Column<string>(type: "text", nullable: false),
                    Differentiation = table.Column<string>(type: "text", nullable: false),
                    SustainabilityImpact = table.Column<string>(type: "text", nullable: false),
                    ProjectConfidence = table.Column<string>(type: "text", nullable: false),
                    Score = table.Column<float>(type: "real", nullable: false),
                    ReviewerComments = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    IdeaId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScoringDimensions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScoringDimensions_Ideas_IdeaId",
                        column: x => x.IdeaId,
                        principalTable: "Ideas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScoringDimensions_IdeaId",
                table: "ScoringDimensions",
                column: "IdeaId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScoringDimensions");
        }
    }
}
