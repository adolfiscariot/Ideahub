using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ideahub.Migrations
{
    /// <inheritdoc />
    public partial class ParentChildSubtasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ParentSubTaskId",
                table: "SubTasks",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SubTasks_ParentSubTaskId",
                table: "SubTasks",
                column: "ParentSubTaskId");

            migrationBuilder.AddForeignKey(
                name: "FK_SubTasks_SubTasks_ParentSubTaskId",
                table: "SubTasks",
                column: "ParentSubTaskId",
                principalTable: "SubTasks",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SubTasks_SubTasks_ParentSubTaskId",
                table: "SubTasks");

            migrationBuilder.DropIndex(
                name: "IX_SubTasks_ParentSubTaskId",
                table: "SubTasks");

            migrationBuilder.DropColumn(
                name: "ParentSubTaskId",
                table: "SubTasks");
        }
    }
}
