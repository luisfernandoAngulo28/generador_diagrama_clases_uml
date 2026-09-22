import { Body, Controller, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ZipArchive, type ArchiverError } from 'archiver';
import { DiagramsService } from '../diagrams/diagrams.service.js';
import { GeneratorService } from './generator.service.js';
import type { UmlModel } from '../diagrams/uml.types.js';

@Controller('generator')
export class GeneratorController {
  constructor(
    private readonly diagramsService: DiagramsService,
    private readonly generatorService: GeneratorService,
  ) {}

  @Post('preview')
  previewLive(
    @Body() body: { model: UmlModel; projectName?: string; groupId?: string },
  ) {
    const projectName = sanitizeProjectName(body.projectName || 'mi-diagrama');
    const files = this.generatorService.generate(body.model, {
      projectName,
      groupId: body.groupId,
    });
    return { projectName, files };
  }

  @Post(':diagramId/preview')
  async previewCode(
    @Param('diagramId') diagramId: string,
    @Query('groupId') groupId: string | undefined,
  ) {
    const diagram = await this.diagramsService.findOne(diagramId);
    const projectName = sanitizeProjectName(diagram.name);
    const files = this.generatorService.generate(diagram.model, {
      projectName,
      groupId,
    });
    return { projectName, files };
  }

  @Post(':diagramId/zip')
  async generateZip(
    @Param('diagramId') diagramId: string,
    @Query('groupId') groupId: string | undefined,
    @Res() res: Response,
  ) {
    const diagram = await this.diagramsService.findOne(diagramId);
    const projectName = sanitizeProjectName(diagram.name);
    const files = this.generatorService.generate(diagram.model, {
      projectName,
      groupId,
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${projectName}.zip"`,
    );

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', (err: ArchiverError) =>
      res.status(500).send({ message: err.message }),
    );
    archive.pipe(res);

    for (const [filePath, content] of Object.entries(files)) {
      archive.append(content, { name: `${projectName}/${filePath}` });
    }

    await archive.finalize();
  }
}

function sanitizeProjectName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'generated-backend';
}
