using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ideahub.Migrations
{
    /// <inheritdoc />
    public partial class UpdateIdeaModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Ideas_Title",
                table: "Ideas");

            migrationBuilder.DropColumn(
                name: "Filter",
                table: "Ideas");

            migrationBuilder.RenameColumn(
                name: "Title",
                table: "Ideas",
                newName: "ProblemStatement");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "Ideas",
                newName: "ProposedSolution");

            migrationBuilder.AddColumn<string>(
                name: "StrategicAlignment",
                table: "Ideas",
                type: "text",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "UseCase",
                table: "Ideas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InnovationCategory",
                table: "Ideas",
                type: "text",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Ideas",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Score",
                table: "Ideas",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SubCategory",
                table: "Ideas",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TechnologyInvolved",
                table: "Ideas",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Ideas_StrategicAlignment",
                table: "Ideas",
                column: "StrategicAlignment");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Ideas_StrategicAlignment",
                table: "Ideas");

            migrationBuilder.DropColumn(
                name: "InnovationCategory",
                table: "Ideas");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Ideas");

            migrationBuilder.DropColumn(
                name: "Score",
                table: "Ideas");

            migrationBuilder.DropColumn(
                name: "StrategicAlignment",
                table: "Ideas");

            migrationBuilder.DropColumn(
                name: "SubCategory",
                table: "Ideas");

            migrationBuilder.DropColumn(
                name: "TechnologyInvolved",
                table: "Ideas");

            migrationBuilder.DropColumn(
                name: "UseCase",
                table: "Ideas");

            migrationBuilder.RenameColumn(
                name: "ProblemStatement",
                table: "Ideas",
                newName: "Title");

            migrationBuilder.RenameColumn(
                name: "ProposedSolution",
                table: "Ideas",
                newName: "Description");

            migrationBuilder.AddColumn<string>(
                name: "Filter",
                table: "Ideas",
                type: "jsonb",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Ideas_Title",
                table: "Ideas",
                column: "Title");
        }
    }
}
