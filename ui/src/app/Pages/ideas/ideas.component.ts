import { Component } from '@angular/core';
import { BaseLayoutComponent } from '../../Components/base-layout/base-layout.component';
import { DataTableComponent } from '../../Components/data-table/data-table.component';

@Component({
  selector: 'app-ideas',
  imports: [BaseLayoutComponent, DataTableComponent],
  templateUrl: './ideas.component.html',
  styleUrl: './ideas.component.scss'
})
export class IdeasComponent {
  tableData = ["mark", "john"]
  columnNames = ["name", "number"]
}
