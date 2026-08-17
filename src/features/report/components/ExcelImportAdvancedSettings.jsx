import React from "react";
import { RotateCcw, Settings2 } from "lucide-react";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";

const FIELDS = [
  {
    key: "dataStartRow",
    label: "Data start row",
    type: "number",
    placeholder: "10",
    description: "First worksheet row to import.",
  },
  {
    key: "dataEndRow",
    label: "Data end row",
    type: "number",
    placeholder: "115",
    description: "Last worksheet row to import.",
  },
  {
    key: "reportStartColumn",
    label: "First report column",
    placeholder: "C",
    description: "First numeric report column.",
  },
  {
    key: "reportEndColumn",
    label: "Last report column",
    placeholder: "Y",
    description: "Last numeric report column.",
  },
  {
    key: "descriptionColumn",
    label: "Description column",
    placeholder: "O",
    description: "Column containing report row labels.",
  },
  {
    key: "mappingHeaderRow",
    label: "Mapping header row",
    type: "number",
    placeholder: "7",
    description: "Row containing linked mapping headers.",
  },
  {
    key: "deptMappingColumn",
    label: "Dept mapping column",
    placeholder: "BZ",
    description: "Column containing Dept Code (Linked).",
  },
  {
    key: "accountMappingColumn",
    label: "Account mapping column",
    placeholder: "CA",
    description: "Column containing Account Code (Linked).",
  },
];

const getFieldId = (sheetName, field) =>
  `excel-import-${sheetName}-${field}`.replace(/[^a-zA-Z0-9_-]/g, "-");

function ImportConfigField({ sheetName, field, value, onChange }) {
  const id = getFieldId(sheetName, field.key);
  const isColumn = field.type !== "number";

  return (
    <VStack as="section" gap={1}>
      <Label htmlFor={id}>{field.label}</Label>
      <Input
        id={id}
        type={field.type || "text"}
        min={field.type === "number" ? 1 : undefined}
        inputMode={field.type === "number" ? "numeric" : "text"}
        value={value ?? ""}
        placeholder={field.placeholder}
        className={field.type === "number" ? "tabular-nums" : "uppercase"}
        aria-describedby={`${id}-description`}
        onChange={(event) =>
          onChange(
            field.key,
            isColumn ? event.target.value.toUpperCase() : event.target.value,
          )
        }
      />
      <p
        id={`${id}-description`}
        className="text-pretty text-xs leading-5 text-muted-foreground"
      >
        {field.description}
      </p>
    </VStack>
  );
}

export default function ExcelImportAdvancedSettings({
  sheet,
  onChange,
  onReset,
}) {
  const config = sheet.importConfig || {};
  const errors = sheet.importIssues?.errors || [];
  const warnings = sheet.importIssues?.warnings || [];
  const previewRows = sheet.mappingPreviewRows || [];

  const updateField = (field, value) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <section
      className="w-full p-4"
      aria-label={`Advanced import settings for ${sheet.name}`}
    >
      <VStack gap={4} width="100%">
        <HStack as="header" gap={3} hAlign="between" vAlign="start" wrap="wrap">
          <VStack gap={1}>
            <HStack gap={2} vAlign="center">
              <Settings2 className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-balance text-base font-semibold text-foreground">
                Advanced import settings · {sheet.name}
              </h2>
            </HStack>
            <p className="text-pretty text-sm leading-6 text-muted-foreground">
              Auto-detected coordinates are editable. The preview updates as you
              change them.
            </p>
          </VStack>
          <HStack gap={2} vAlign="center">
            <Badge variant={errors.length === 0 ? "secondary" : "destructive"}>
              {errors.length === 0 ? "Ready" : "Needs attention"}
            </Badge>
            <Button type="button" variant="outline" size="sm" onClick={onReset}>
              <RotateCcw aria-hidden="true" />
              Reset auto-detect
            </Button>
          </HStack>
        </HStack>

        <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="sr-only">Worksheet import coordinates</legend>
          {FIELDS.map((field) => (
            <ImportConfigField
              key={field.key}
              sheetName={sheet.name}
              field={field}
              value={config[field.key]}
              onChange={updateField}
            />
          ))}
        </fieldset>

        {(errors.length > 0 || warnings.length > 0) && (
          <VStack as="section" gap={2} aria-live="polite">
            {errors.length > 0 && (
              <section
                aria-label="Import setting errors"
                className="rounded-xl border border-destructive/25 bg-destructive/8 text-destructive"
              >
                <VStack gap={1} padding={3}>
                  {errors.map((message) => (
                    <p key={message} className="text-pretty text-sm leading-5">
                      {message}
                    </p>
                  ))}
                </VStack>
              </section>
            )}
            {warnings.length > 0 && (
              <section
                aria-label="Import setting warnings"
                className="rounded-xl border border-border bg-muted/35 text-foreground"
              >
                <VStack gap={1} padding={3}>
                  {warnings.map((message) => (
                    <p key={message} className="text-pretty text-sm leading-5">
                      {message}
                    </p>
                  ))}
                </VStack>
              </section>
            )}
          </VStack>
        )}

        <VStack as="section" gap={2}>
          <HStack
            as="header"
            gap={2}
            hAlign="between"
            vAlign="center"
            wrap="wrap"
          >
            <h3 className="text-balance text-sm font-semibold text-foreground">
              Mapping preview
            </h3>
            <p className="text-sm tabular-nums text-muted-foreground">
              {sheet.detectedRows.length} rows · {sheet.detectedColumns.length}{" "}
              report columns
            </p>
          </HStack>
          {previewRows.length > 0 ? (
            <section className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Row</TableHead>
                    <TableHead className="min-w-48">Description</TableHead>
                    <TableHead className="min-w-40">Dept mapping</TableHead>
                    <TableHead className="min-w-64">Account mapping</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row) => (
                    <TableRow key={`${row.rowNumber}-${row.description}`}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {row.rowNumber}
                      </TableCell>
                      <TableCell
                        className="max-w-64 truncate font-medium"
                        title={row.description}
                      >
                        {row.description}
                      </TableCell>
                      <TableCell
                        className="max-w-48 truncate font-mono text-xs"
                        title={row.dept || ""}
                      >
                        {row.dept || "—"}
                      </TableCell>
                      <TableCell
                        className="max-w-80 truncate font-mono text-xs"
                        title={row.accCodes || ""}
                      >
                        {row.accCodes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-pretty text-sm text-muted-foreground">
              No report rows match these coordinates. Adjust the row range or
              description column.
            </p>
          )}
        </VStack>
      </VStack>
    </section>
  );
}
