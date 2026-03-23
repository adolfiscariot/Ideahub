using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ideahub.Migrations
{
    /// <inheritdoc />
    public partial class ChildAndParentSubtaskMustBeInSameTask : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SubTasks_SubTasks_ParentSubTaskId",
                table: "SubTasks");

            migrationBuilder.DropIndex(
                name: "IX_SubTasks_ParentSubTaskId",
                table: "SubTasks");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_SubTasks_Id_ProjectTaskId",
                table: "SubTasks",
                columns: new[] { "Id", "ProjectTaskId" });

            migrationBuilder.CreateIndex(
                name: "IX_SubTasks_ParentSubTaskId_ProjectTaskId",
                table: "SubTasks",
                columns: new[] { "ParentSubTaskId", "ProjectTaskId" });

            migrationBuilder.AddForeignKey(
                name: "FK_SubTasks_SubTasks_ParentSubTaskId_ProjectTaskId",
                table: "SubTasks",
                columns: new[] { "ParentSubTaskId", "ProjectTaskId" },
                principalTable: "SubTasks",
                principalColumns: new[] { "Id", "ProjectTaskId" },
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SubTasks_SubTasks_ParentSubTaskId_ProjectTaskId",
                table: "SubTasks");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_SubTasks_Id_ProjectTaskId",
                table: "SubTasks");

            migrationBuilder.DropIndex(
                name: "IX_SubTasks_ParentSubTaskId_ProjectTaskId",
                table: "SubTasks");

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
    }
}
