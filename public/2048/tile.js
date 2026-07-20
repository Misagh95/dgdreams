function Tile(position, value) {
  this.x = position.x;
  this.y = position.y;
  this.value = value || 2;
  this.mergedFrom = null;
}

Tile.prototype.savePosition = function () {
  this.previousX = this.x;
  this.previousY = this.y;
};

Tile.prototype.updatePosition = function (position) {
  this.x = position.x;
  this.y = position.y;
};
