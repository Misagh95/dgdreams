function Grid(size) {
  this.size = size;
  this.cells = [];
  this.build();
}

Grid.prototype.build = function () {
  for (let y = 0; y < this.size; y++) {
    const row = [];
    for (let x = 0; x < this.size; x++) row.push(null);
    this.cells.push(row);
  }
};

Grid.prototype.randomAvailableCell = function () {
  const cells = this.availableCells();
  return cells.length ? cells[Math.floor(Math.random() * cells.length)] : null;
};

Grid.prototype.availableCells = function () {
  const cells = [];
  this.eachCell(function (x, y, tile) { if (!tile) cells.push({ x, y }); });
  return cells;
};

Grid.prototype.cellsAvailable = function () {
  return !!this.availableCells().length;
};

Grid.prototype.cellAvailable = function (cell) {
  return !this.cellContent(cell);
};

Grid.prototype.insertTile = function (tile) {
  this.cells[tile.y][tile.x] = tile;
};

Grid.prototype.removeTile = function (tile) {
  this.cells[tile.y][tile.x] = null;
};

Grid.prototype.cellContent = function (cell) {
  if (this.withinBounds(cell)) return this.cells[cell.y][cell.x];
  return null;
};

Grid.prototype.withinBounds = function (cell) {
  return cell.x >= 0 && cell.x < this.size && cell.y >= 0 && cell.y < this.size;
};

Grid.prototype.eachCell = function (cb) {
  for (let y = 0; y < this.size; y++)
    for (let x = 0; x < this.size; x++)
      cb(x, y, this.cells[y][x]);
};
