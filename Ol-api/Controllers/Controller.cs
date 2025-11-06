using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

[Route("api/[controller]")]
[ApiController]
public class PositionDataController : ControllerBase
{
    private readonly DatabaseContext _context;

    public PositionDataController(DatabaseContext context)
    {
        _context = context;
    }
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PositionData>>> GetPositionData()
    {
        return await _context.PositionData.ToListAsync();
    }
    [HttpGet("{id}")]
    public async Task<ActionResult<PositionData>> GetPositionData(int id)
    {
        var positionData = await _context.PositionData.FindAsync(id);

        if (positionData == null)
        {
            return NotFound();
        }

        return positionData;
    }
    [HttpPost]
    public async Task<ActionResult<PositionData>> PostPositionData(PositionData positionData)
    {
        // Sprawdzenie
        bool exists = await _context.PositionData.AnyAsync(p =>
            p.Latitude == positionData.Latitude && p.Longitude == positionData.Longitude
        );

        if (exists)
        {
            //Conflict (HTTP 409)
            return Conflict(new { message = "Rekord o tych współrzędnych już istnieje." });
        }

        // Nowy rekord
        _context.PositionData.Add(positionData);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPositionData), new { id = positionData.Id }, positionData);
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePositionData(int id)
    {
        var positionData = await _context.PositionData.FindAsync(id);
        if (positionData == null)
        {
            return NotFound();
        }

        _context.PositionData.Remove(positionData);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteAllPositionData()
    {
        var allRecords = _context.PositionData;
        _context.PositionData.RemoveRange(allRecords);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> PostBulk([FromBody] List<PositionData> positions)
    {
        try
        {
            if (positions is null || positions.Count == 0)
                return BadRequest("empty");

            // pobierz istniejące klucze
            var dbKeys = await _context.PositionData
                .Select(p => new { p.Latitude, p.Longitude })
                .ToListAsync();

            var existing = new HashSet<(double lat, double lon)>(
                dbKeys.Select(x => (x.Latitude, x.Longitude))
            );

            // filtrowanie duplikatów
            var filtered = positions
                .Where(p => !existing.Contains((p.Latitude, p.Longitude)))
                .ToList();

            if (filtered.Count > 0)
            {
                _context.PositionData.AddRange(filtered);
                await _context.SaveChangesAsync();
            }

            return Ok(new { inserted = filtered.Count, skipped = positions.Count - filtered.Count });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, stack = ex.StackTrace });
        }
    }
    [HttpGet("filtered")]
    public async Task<ActionResult<IEnumerable<PositionData>>> GetFiltered(
     [FromQuery] bool? inside,
     [FromQuery] string? sort,
     [FromQuery] bool asc = true
 )
    {
        IQueryable<PositionData> q = _context.PositionData;

        // filter
        if (inside.HasValue)
        {
            q = q.Where(p => p.IsInsidePolygon == inside.Value);
        }

        // sort
        if (!string.IsNullOrWhiteSpace(sort))
        {
            q = sort.ToLower() switch
            {
                "id" => asc ? q.OrderBy(x => x.Id) : q.OrderByDescending(x => x.Id),
                "latitude" => asc ? q.OrderBy(x => x.Latitude) : q.OrderByDescending(x => x.Latitude),
                "longitude" => asc ? q.OrderBy(x => x.Longitude) : q.OrderByDescending(x => x.Longitude),
                "isinsidepolygon" => asc ? q.OrderBy(x => x.IsInsidePolygon) : q.OrderByDescending(x => x.IsInsidePolygon),
                "exittime" => asc ? q.OrderBy(x => x.ExitTime) : q.OrderByDescending(x => x.ExitTime),
                _ => q
            };
        }
        else
        {
            // default sort
            q = q.OrderBy(x => x.Id);
        }

        return await q.ToListAsync();
    }




}