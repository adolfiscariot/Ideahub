using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ideahub.Migrations
{
    /// <inheritdoc />
    public partial class AddTimesheetMediaContext : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TimesheetId",
                table: "Media",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Media_TimesheetId",
                table: "Media",
                column: "TimesheetId");

            migrationBuilder.AddForeignKey(
                name: "FK_Media_Timesheets_TimesheetId",
                table: "Media",
                column: "TimesheetId",
                principalTable: "Timesheets",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Media_Timesheets_TimesheetId",
                table: "Media");

            migrationBuilder.DropIndex(
                name: "IX_Media_TimesheetId",
                table: "Media");

            migrationBuilder.DropColumn(
                name: "TimesheetId",
                table: "Media");
        }
    }
}
